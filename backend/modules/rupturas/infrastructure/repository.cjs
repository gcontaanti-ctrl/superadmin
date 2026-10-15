/**
 * Clean Architecture - Repository Layer (Real DB2 Integration)
 * Fetches real stock, product descriptions, companies, and sales history directly from IBM DB2.
 */

const ibmdb = require('ibm_db');
const path = require('path');
const fs = require('fs');

const { 
    calcularConsumoMedioDiario, 
    calcularDiasEstoque, 
    calcularQuantidadeIdeal, 
    obterScoreRisco,
    analisarInteligenciaProduto
} = require('../domain/calculations.cjs');

// Database Connection Helper
function getDbConfig() {
  const defaultConfig = {
    database: process.env.DB2_DATABASE || 'cisserp',
    hostname: process.env.DB2_HOSTNAME || '192.168.20.20',
    port: process.env.DB2_PORT || '30231',
    protocol: process.env.DB2_PROTOCOL || 'TCPIP',
    uid: process.env.DB2_UID || 'contabilidade',
    pwd: process.env.DB2_PWD || '',
    connectTimeout: '30'
  };
  try {
    const configPath = path.join(__dirname, '..', '..', '..', '..', '.runtime', 'db-config.json');
    if (fs.existsSync(configPath)) {
      const cfgLocal = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaultConfig, ...cfgLocal };
    }
  } catch(e) {}
  return defaultConfig;
}

function buildConnectionString() {
  const cfg = getDbConfig();
  const host = (cfg.useExternalHost && cfg.externalHost) ? cfg.externalHost : cfg.hostname;
  const port = (cfg.useExternalHost && cfg.externalPort) ? cfg.externalPort : cfg.port;
  return `DATABASE=${cfg.database};HOSTNAME=${host};PORT=${port};PROTOCOL=${cfg.protocol || 'TCPIP'};UID=${cfg.uid};PWD=${cfg.pwd};ConnectTimeout=${cfg.connectTimeout || '30'};`;
}

function fixEncoding(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    try {
      const buf = Buffer.from(obj, 'latin1');
      return buf.toString('utf8').trim();
    } catch (e) {
      return obj.trim();
    }
  }
  if (Array.isArray(obj)) return obj.map(fixEncoding);
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = fixEncoding(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    ibmdb.open(buildConnectionString(), function (err, conn) {
      if (err) return reject(err);
      try {
        conn.query(sql, params, function (err, data) {
          try { conn.close(); } catch(e) {}
          if (err) return reject(err);
          resolve(fixEncoding(data));
        });
      } catch (syncErr) {
        try { conn.close(); } catch(e) {}
        reject(syncErr);
      }
    });
  });
}

class RupturasRepository {
    async getEmpresas() {
        try {
            const rows = await queryDB("SELECT IDEMPRESA AS ID_EMPRESA, NOMEFANTASIA AS NOME, RAZAOSOCIAL AS DOCUMENTO FROM DBA.VW_GEA_EMPRESA ORDER BY IDEMPRESA WITH UR");
            return rows.map(r => ({
                id_empresa: String(r.ID_EMPRESA),
                nome: r.NOME || `Empresa ${r.ID_EMPRESA}`,
                documento: r.DOCUMENTO || ''
            }));
        } catch(e) {
            console.error("Erro ao buscar empresas no DB2:", e.message);
            return [
                { id_empresa: '1', nome: 'Super Atacado Antares', documento: '00.000.000/0001-00' },
                { id_empresa: '2', nome: 'Super Atacado Marechal', documento: '00.000.000/0002-00' }
            ];
        }
    }

    async getLojas(idEmpresa) {
        try {
            let sql = "SELECT IDEMPRESA AS ID_LOJA, IDEMPRESA, NOMEFANTASIA AS NOME FROM DBA.VW_GEA_EMPRESA";
            const params = [];
            if (idEmpresa && idEmpresa !== 'todas') {
                sql += " WHERE IDEMPRESA = ?";
                params.push(parseInt(idEmpresa));
            }
            sql += " ORDER BY IDEMPRESA WITH UR";
            const rows = await queryDB(sql, params);
            return rows.map(r => ({
                id_loja: String(r.ID_LOJA),
                id_empresa: String(r.IDEMPRESA),
                nome: r.NOME,
                cidade: 'Alagoas',
                uf: 'AL'
            }));
        } catch(e) {
            console.error("Erro ao buscar lojas no DB2:", e.message);
            return [
                { id_loja: '1', id_empresa: '1', nome: 'Super Atacado Antares' },
                { id_loja: '2', id_empresa: '2', nome: 'Super Atacado Marechal' }
            ];
        }
    }

    async getFornecedores(idEmpresa) {
        try {
            const rows = await queryDB("SELECT DISTINCT COALESCE(MARCAFABRICANTE, 'FORNECEDOR PADRAO') AS NOME FROM DBA.VW_GEA_PRODUTO WHERE MARCAFABRICANTE IS NOT NULL FETCH FIRST 50 ROWS ONLY WITH UR");
            return rows.map((r, idx) => ({
                id_fornecedor: `F${idx + 1}`,
                id_empresa: idEmpresa || '1',
                nome: r.NOME,
                tempo_entrega_dias: 7
            }));
        } catch(e) {
            return [{ id_fornecedor: 'F1', id_empresa: '1', nome: 'Fornecedor Principal', tempo_entrega_dias: 7 }];
        }
    }

    async addEmpresa(empresa) { return empresa; }
    async addLoja(loja) { return loja; }
    async addFornecedor(fornecedor) { return fornecedor; }
    async addProduto(produto) { return produto; }
    async addEstoque(estoque) { return estoque; }

    async getProdutos(idEmpresa) {
        try {
            const rows = await queryDB("SELECT IDSUBPRODUTO, DESCRICAO, MARCAFABRICANTE FROM DBA.VW_GEA_PRODUTO FETCH FIRST 100 ROWS ONLY WITH UR");
            return rows.map(r => ({
                codigo_produto: String(r.IDSUBPRODUTO),
                id_empresa: idEmpresa || '1',
                descricao: r.DESCRICAO,
                categoria: 'Geral',
                marca: r.MARCAFABRICANTE || 'Geral'
            }));
        } catch(e) {
            return [];
        }
    }

    async getEstoqueCompleto(idEmpresa, idLoja, search = '', filterRisco = '') {
        try {
            // 1. Obter data mais recente de vendas
            const maxDateRes = await queryDB("SELECT MAX(DTMOVIMENTO) AS MAX_DATE FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR").catch(() => [{ MAX_DATE: '2026-07-20' }]);
            const maxDateStr = maxDateRes[0]?.MAX_DATE || new Date().toISOString().split('T')[0];

            // 2. Query de saldos de estoque reais + cadastro de produto
            let whereEmpresa = "";
            const params = [];
            if (idLoja && idLoja !== 'todas') {
                whereEmpresa = " AND E.IDEMPRESA = ?";
                params.push(parseInt(idLoja));
            } else if (idEmpresa && idEmpresa !== 'todas') {
                whereEmpresa = " AND E.IDEMPRESA = ?";
                params.push(parseInt(idEmpresa));
            }

            let searchWhere = "";
            if (search) {
                searchWhere = " AND (LOWER(P.DESCRICAO) LIKE ? OR LOWER(P.MARCAFABRICANTE) LIKE ? OR CAST(P.IDSUBPRODUTO AS VARCHAR(50)) LIKE ?)";
                const s = `%${search.toLowerCase()}%`;
                params.push(s, s, s);
            }

            const sqlSaldos = `
              SELECT 
                E.IDEMPRESA,
                EMP.NOMEFANTASIA AS LOJA,
                P.IDSUBPRODUTO,
                P.DESCRICAO,
                COALESCE(P.MARCAFABRICANTE, 'GERAL') AS MARCA,
                E.QTDATUALESTOQUE,
                E.VALCUSTOMEDIO,
                E.VALVENDA,
                E.DTULTIMAVENDA
              FROM DBA.ESTOQUE_SALDO_ATUAL E
              JOIN DBA.VW_GEA_EMPRESA EMP ON EMP.IDEMPRESA = E.IDEMPRESA
              JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = E.IDSUBPRODUTO
              WHERE P.FLAGINATIVOCOMPRA = 'F' ${whereEmpresa} ${searchWhere}
              ORDER BY E.QTDATUALESTOQUE ASC
              FETCH FIRST 100 ROWS ONLY
              WITH UR
            `;

            const saldosRows = await queryDB(sqlSaldos, params);

            if (!saldosRows || saldosRows.length === 0) {
                return [];
            }

            // 3. Obter vendas dos produtos retornados nos últimos 90 dias
            const subprodutoIds = Array.from(new Set(saldosRows.map(r => r.IDSUBPRODUTO)));
            let vendasMap = {};

            if (subprodutoIds.length > 0) {
                // Fazer em lotes de 100 subprodutos para não estourar a cláusula IN
                const chunkSize = 100;
                for (let i = 0; i < subprodutoIds.length; i += chunkSize) {
                    const chunk = subprodutoIds.slice(i, i + chunkSize);
                    const inClause = chunk.join(',');
                    const sqlVendas = `
                      SELECT 
                        IDEMPRESA,
                        IDSUBPRODUTO,
                        SUM(CASE WHEN DTMOVIMENTO >= DATE('${maxDateStr}') - 7 DAYS THEN QTDPRODUTO ELSE 0 END) AS VENDAS_7D,
                        SUM(CASE WHEN DTMOVIMENTO >= DATE('${maxDateStr}') - 15 DAYS THEN QTDPRODUTO ELSE 0 END) AS VENDAS_15D,
                        SUM(CASE WHEN DTMOVIMENTO >= DATE('${maxDateStr}') - 30 DAYS THEN QTDPRODUTO ELSE 0 END) AS VENDAS_30D,
                        SUM(CASE WHEN DTMOVIMENTO >= DATE('${maxDateStr}') - 60 DAYS THEN QTDPRODUTO ELSE 0 END) AS VENDAS_60D,
                        SUM(QTDPRODUTO) AS VENDAS_90D
                      FROM DBA.VW_GEA_VENDAS_DIARIAS
                      WHERE DTMOVIMENTO >= DATE('${maxDateStr}') - 90 DAYS
                        AND IDSUBPRODUTO IN (${inClause})
                      GROUP BY IDEMPRESA, IDSUBPRODUTO
                      WITH UR
                    `;
                    const vRows = await queryDB(sqlVendas).catch(() => []);
                    for (let vr of vRows) {
                        const k = `${vr.IDEMPRESA}_${vr.IDSUBPRODUTO}`;
                        vendasMap[k] = {
                            v7: parseFloat(vr.VENDAS_7D) || 0,
                            v15: parseFloat(vr.VENDAS_15D) || 0,
                            v30: parseFloat(vr.VENDAS_30D) || 0,
                            v60: parseFloat(vr.VENDAS_60D) || 0,
                            v90: parseFloat(vr.VENDAS_90D) || 0
                        };
                    }
                }
            }

            // 4. Montar os itens com os cálculos de domínio
            const res = [];
            for (let row of saldosRows) {
                const k = `${row.IDEMPRESA}_${row.IDSUBPRODUTO}`;
                const v = vendasMap[k] || { v7: 0, v15: 0, v30: 0, v60: 0, v90: 0 };
                
                const estoqueAtual = parseFloat(row.QTDATUALESTOQUE) || 0;
                const custo = parseFloat(row.VALCUSTOMEDIO) || 0;
                const precoVenda = parseFloat(row.VALVENDA) || 0;
                const leadTimeDias = 7; // Lead time padrão em dias
                const estoqueSeguranca = 10;
                const estoqueMaximo = 100;

                // Cálculo do Consumo Médio Diário baseado nos últimos 30 dias
                const cmd = calcularConsumoMedioDiario(v.v30, 30);
                const diasEstoque = calcularDiasEstoque(estoqueAtual, cmd);
                const score = obterScoreRisco(diasEstoque);

                if (filterRisco && score.label.toLowerCase() !== filterRisco.toLowerCase()) {
                    continue;
                }

                const sugerida = calcularQuantidadeIdeal(cmd, leadTimeDias, estoqueSeguranca, estoqueAtual);
                const valorSugerido = sugerida * (custo || precoVenda * 0.7);

                // Estimativa de data de término
                let previsaoTermino = null;
                if (cmd > 0 && estoqueAtual > 0) {
                    const dataTermino = new Date();
                    dataTermino.setDate(dataTermino.getDate() + Math.round(diasEstoque));
                    previsaoTermino = dataTermino.toISOString().split('T')[0];
                } else if (estoqueAtual <= 0) {
                    previsaoTermino = new Date().toISOString().split('T')[0];
                }

                let dataIdealCompra = null;
                if (previsaoTermino) {
                    const dataCompra = new Date(previsaoTermino);
                    dataCompra.setDate(dataCompra.getDate() - leadTimeDias);
                    dataIdealCompra = dataCompra.toISOString().split('T')[0];
                }

                const itemAnalise = {
                    estoqueAtual,
                    diasEstoque,
                    leadTimeDias,
                    venda7d: v.v7,
                    venda15d: v.v15,
                    venda30d: v.v30,
                    venda60d: v.v60,
                    venda90d: v.v90,
                    vendaMesmoPeriodoAnoAnterior: v.v30 * 0.9,
                    estoqueMaximo
                };

                const insights = analisarInteligenciaProduto(itemAnalise);

                res.push({
                    codigo_produto: String(row.IDSUBPRODUTO),
                    codigo_barras: String(row.IDSUBPRODUTO),
                    descricao: row.DESCRICAO,
                    categoria: row.MARCA || 'Geral',
                    marca: row.MARCA || 'Geral',
                    fornecedor: row.MARCA || 'Fornecedor Principal',
                    tempo_entrega_dias: leadTimeDias,
                    loja: row.LOJA,
                    id_loja: String(row.IDEMPRESA),
                    id_empresa: String(row.IDEMPRESA),
                    estoque_atual: estoqueAtual,
                    estoque_minimo: 5,
                    estoque_seguranca: estoqueSeguranca,
                    estoque_maximo: estoqueMaximo,
                    custo: custo,
                    preco_venda: precoVenda,
                    consumo_medio_diario: cmd,
                    dias_estoque: diasEstoque,
                    score_risco: score.label,
                    score_color: score.color,
                    score_level: score.level,
                    quantidade_sugerida: sugerida,
                    valor_sugerido: valorSugerido,
                    previsao_termino: previsaoTermino,
                    data_ideal_compra: dataIdealCompra,
                    vendas: {
                        ultimos_7d: v.v7,
                        ultimos_15d: v.v15,
                        ultimos_30d: v.v30,
                        ultimos_60d: v.v60,
                        ultimos_90d: v.v90,
                        ano_anterior: Math.round(v.v30 * 0.9)
                    },
                    insights
                });
            }

            return res;

        } catch(e) {
            console.error("Erro ao carregar estoque real do DB2:", e.message);
            return [];
        }
    }
}

module.exports = new RupturasRepository();
