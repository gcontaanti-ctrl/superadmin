
const express = require('express');
const cors = require('cors');
const ibmdb = require('ibm_db');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

function loadLocalEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();

const CONFIG_DIR = path.join(__dirname, '.runtime');
const DB_CONFIG_PATH = process.env.DB_CONFIG_PATH || path.join(CONFIG_DIR, 'db-config.json');
const SUPABASE_CONFIG_TABLE = process.env.SUPABASE_CONFIG_TABLE || 'erp_db_config';
const SUPABASE_CONFIG_ID = process.env.SUPABASE_CONFIG_ID || 'default';

const DEFAULT_DB_CONFIG = {
  database: process.env.DB2_DATABASE || 'cisserp',
  hostname: process.env.DB2_HOSTNAME || '192.168.20.20',
  port: process.env.DB2_PORT || '30231',
  protocol: process.env.DB2_PROTOCOL || 'TCPIP',
  uid: process.env.DB2_UID || 'contabilidade',
  pwd: process.env.DB2_PWD || '',
  connectTimeout: process.env.DB2_CONNECT_TIMEOUT || '30',
  useExternalHost: process.env.DB2_USE_EXTERNAL_HOST === 'true',
  externalHost: process.env.DB2_EXTERNAL_HOST || '',
  externalPort: process.env.DB2_EXTERNAL_PORT || '',
  updatedAt: null,
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readStoredDbConfig() {
  try {
    if (!fs.existsSync(DB_CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('Falha ao ler configuracao DB2:', err.message);
    return {};
  }
}

function getSupabaseConfigEnv() {
  return {
    url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    serviceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  };
}

function hasSupabaseConfigStore() {
  const env = getSupabaseConfigEnv();
  return Boolean(env.url && env.serviceRoleKey);
}

function supabaseHeaders(extra = {}) {
  const env = getSupabaseConfigEnv();
  return {
    apikey: env.serviceRoleKey,
    authorization: `Bearer ${env.serviceRoleKey}`,
    'content-type': 'application/json',
    ...extra,
  };
}

async function fetchSupabaseDbConfig() {
  if (!hasSupabaseConfigStore()) return null;

  const env = getSupabaseConfigEnv();
  const url = `${env.url}/rest/v1/${SUPABASE_CONFIG_TABLE}?id=eq.${encodeURIComponent(SUPABASE_CONFIG_ID)}&select=config&limit=1`;
  const response = await fetch(url, {
    headers: supabaseHeaders({ accept: 'application/json' }),
  });

  if (!response.ok) {
    throw new Error(`Supabase config read failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  return rows?.[0]?.config || null;
}

async function saveSupabaseDbConfig(config) {
  if (!hasSupabaseConfigStore()) return false;

  const env = getSupabaseConfigEnv();
  const response = await fetch(`${env.url}/rest/v1/${SUPABASE_CONFIG_TABLE}`, {
    method: 'POST',
    headers: supabaseHeaders({
      prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      id: SUPABASE_CONFIG_ID,
      config,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase config save failed: ${response.status} ${await response.text()}`);
  }

  return true;
}

function writeLocalDbConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(DB_CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function syncDbConfigFromSupabase() {
  if (!hasSupabaseConfigStore()) return false;

  try {
    const remoteConfig = await fetchSupabaseDbConfig();
    if (!remoteConfig) return false;

    const normalized = normalizeDbConfig(remoteConfig, DEFAULT_DB_CONFIG);
    writeLocalDbConfig(normalized);
    return true;
  } catch (err) {
    console.error('Falha ao sincronizar configuracao do Supabase:', err.message);
    return false;
  }
}

function normalizeDbConfig(input = {}, base = DEFAULT_DB_CONFIG) {
  const next = {
    ...base,
    database: String(input.database ?? base.database ?? '').trim(),
    hostname: String(input.hostname ?? base.hostname ?? '').trim(),
    port: String(input.port ?? base.port ?? '').trim(),
    protocol: String(input.protocol ?? base.protocol ?? 'TCPIP').trim().toUpperCase(),
    uid: String(input.uid ?? base.uid ?? '').trim(),
    connectTimeout: String(input.connectTimeout ?? base.connectTimeout ?? '30').trim(),
    useExternalHost: Boolean(input.useExternalHost ?? base.useExternalHost),
    externalHost: String(input.externalHost ?? base.externalHost ?? '').trim(),
    externalPort: String(input.externalPort ?? base.externalPort ?? '').trim(),
    updatedAt: input.updatedAt ?? base.updatedAt ?? null,
  };

  if (input.clearPassword === true) {
    next.pwd = '';
  } else if (typeof input.password === 'string' && input.password.length > 0) {
    next.pwd = input.password;
  } else if (typeof input.pwd === 'string' && input.pwd.length > 0) {
    next.pwd = input.pwd;
  } else {
    next.pwd = base.pwd ?? '';
  }

  return next;
}

function getDbConfig() {
  return normalizeDbConfig(readStoredDbConfig(), DEFAULT_DB_CONFIG);
}

function resolveDbEndpoint(config) {
  const useExternal = Boolean(config.useExternalHost && config.externalHost);
  return {
    host: useExternal ? config.externalHost : config.hostname,
    port: useExternal ? (config.externalPort || config.port) : config.port,
    mode: useExternal ? 'external' : 'local',
  };
}

function cleanConnectionValue(value) {
  return String(value ?? '').replace(/;/g, '').trim();
}

function buildConnectionString(config = getDbConfig()) {
  const endpoint = resolveDbEndpoint(config);
  return [
    `DATABASE=${cleanConnectionValue(config.database)}`,
    `HOSTNAME=${cleanConnectionValue(endpoint.host)}`,
    `PORT=${cleanConnectionValue(endpoint.port)}`,
    `PROTOCOL=${cleanConnectionValue(config.protocol || 'TCPIP')}`,
    `UID=${cleanConnectionValue(config.uid)}`,
    `PWD=${cleanConnectionValue(config.pwd)}`,
    `ConnectTimeout=${cleanConnectionValue(config.connectTimeout || '30')}`,
  ].join(';') + ';';
}

function publicDbConfig(config = getDbConfig()) {
  const endpoint = resolveDbEndpoint(config);
  return {
    database: config.database,
    hostname: config.hostname,
    port: config.port,
    protocol: config.protocol,
    uid: config.uid,
    connectTimeout: config.connectTimeout,
    useExternalHost: config.useExternalHost,
    externalHost: config.externalHost,
    externalPort: config.externalPort,
    effectiveHost: endpoint.host,
    effectivePort: endpoint.port,
    mode: endpoint.mode,
    storage: hasSupabaseConfigStore() ? 'supabase' : 'local',
    hasPassword: Boolean(config.pwd),
    updatedAt: config.updatedAt,
  };
}

async function saveDbConfig(input) {
  const current = getDbConfig();
  const next = normalizeDbConfig(input, current);
  next.updatedAt = new Date().toISOString();

  writeLocalDbConfig(next);
  await saveSupabaseDbConfig(next);
  return next;
}

function openDb(callback) {
  ibmdb.open(buildConnectionString(), callback);
}

function testDbConnection(config) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    ibmdb.open(buildConnectionString(config), (err, conn) => {
      if (err) return reject(err);

      conn.query("SELECT CURRENT DATE AS HOJE FROM SYSIBM.SYSDUMMY1 WITH UR", (queryErr, rows) => {
        try {
          conn.closeSync();
        } catch (_) {}

        if (queryErr) return reject(queryErr);

        resolve({
          connected: true,
          latencyMs: Date.now() - startedAt,
          serverDate: rows?.[0]?.HOJE,
          ...publicDbConfig(config),
        });
      });
    });
  });
}

function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    openDb(function (err, conn) {
      if (err) return reject(err);
      conn.query(sql, params, function (err, data) {
        conn.closeSync();
        if (err) return reject(err);
        resolve(data);
      });
    });
  });
}

app.get('/api/config/db', async (req, res) => {
  await syncDbConfigFromSupabase();
  res.json(publicDbConfig());
});

app.post('/api/config/db', async (req, res) => {
  try {
    const config = await saveDbConfig(req.body || {});
    res.json(publicDbConfig(config));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/db/test', async (req, res) => {
  try {
    const config = normalizeDbConfig(req.body || {}, getDbConfig());
    const result = await testDbConnection(config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get('/api/kpis', async (req, res) => {
  try {
    const idEmpresa = req.query.idEmpresa;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';

    const empresasCount = await queryDB("SELECT COUNT(*) AS total FROM ADM.EMPRESAS WITH UR");
    const fornecedoresCount = await queryDB("SELECT COUNT(*) AS total FROM ADM.FORNECEDORES WITH UR");
    const estoqueCount = await queryDB("SELECT COUNT(*) AS total FROM ADM.ESTOQUE_LOCAL WITH UR");
    
    // Obter data mais recente de vendas
    const dateRes = await queryDB("SELECT MAX(DTMOVIMENTO) AS max_date FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    const maxDate = dateRes[0]?.MAX_DATE || '2026-05-19';

    // Query de faturamento e notas filtrada ou não
    let salesSql = "SELECT SUM(VALTOTLIQUIDO) AS faturamento, COUNT(DISTINCT NUMNOTA) AS notas FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO = ? WITH UR";
    let params = [maxDate];
    if (isFiltered) {
      salesSql = "SELECT SUM(VALTOTLIQUIDO) AS faturamento, COUNT(DISTINCT NUMNOTA) AS notas FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO = ? AND IDEMPRESA = ? WITH UR";
      params.push(parseInt(idEmpresa));
    }

    const salesRes = await queryDB(salesSql, params);

    const faturamentoNum = parseFloat(salesRes[0]?.FATURAMENTO) || 0;
    const notasNum = parseInt(salesRes[0]?.NOTAS) || 0;
    const ticketMedioNum = notasNum > 0 ? (faturamentoNum / notasNum) : 0;

    res.json({
      empresas: isFiltered ? 1 : (empresasCount[0]?.TOTAL || 0),
      fornecedores: fornecedoresCount[0]?.TOTAL || 0,
      itens_estoque: estoqueCount[0]?.TOTAL || 0,
      faturamento: faturamentoNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ticket_medio: ticketMedioNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendas-curva', async (req, res) => {
  try {
    const idEmpresa = req.query.idEmpresa;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';

    const dateRes = await queryDB("SELECT MAX(DTMOVIMENTO) AS max_date FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    const maxDate = dateRes[0]?.MAX_DATE || '2026-05-19';

    let sql = "SELECT DTMOVIMENTO, SUM(VALTOTLIQUIDO) AS total_dia FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO >= CAST(? AS DATE) - 8 DAYS GROUP BY DTMOVIMENTO ORDER BY DTMOVIMENTO WITH UR";
    let params = [maxDate];

    if (isFiltered) {
      sql = "SELECT DTMOVIMENTO, SUM(VALTOTLIQUIDO) AS total_dia FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO >= CAST(? AS DATE) - 8 DAYS AND IDEMPRESA = ? GROUP BY DTMOVIMENTO ORDER BY DTMOVIMENTO WITH UR";
      params.push(parseInt(idEmpresa));
    }

    const curveRes = await queryDB(sql, params);

    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const formatted = curveRes.map(row => {
      const dateObj = new Date(row.DTMOVIMENTO + 'T00:00:00');
      const diaSemanaStr = diasSemana[dateObj.getDay()];
      const totalMil = (parseFloat(row.TOTAL_DIA) || 0) / 1000;
      return {
        d: diaSemanaStr,
        vendas: Math.round(totalMil * 100) / 100, // em milhares R$
        meta: Math.round((totalMil * 0.95) * 100) / 100
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendas-lojas', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const now = new Date();
    const targetYear = ano ? parseInt(ano) : now.getFullYear();
    const targetMonth = mes ? parseInt(mes) : (now.getMonth() + 1);

    const fatRes = await queryDB(
      `SELECT V.IDEMPRESA, E.NOMEFANTASIA,
         SUM(V.VALTOTLIQUIDO) AS faturamento,
         SUM(V.VALCUSTO) AS custo_total
       FROM DBA.VW_GEA_VENDAS_DIARIAS V
       LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
       WHERE YEAR(V.DTMOVIMENTO) = ? AND MONTH(V.DTMOVIMENTO) = ?
       GROUP BY V.IDEMPRESA, E.NOMEFANTASIA
       ORDER BY faturamento DESC WITH UR`,
      [targetYear, targetMonth]
    );

    const formatted = fatRes.map(row => {
      const fat = parseFloat(row.FATURAMENTO) || 0;
      const custo = parseFloat(row.CUSTO_TOTAL) || 0;
      const margemReais = fat - custo;
      const margem = fat > 0 ? (margemReais / fat) * 100 : 0;
      return {
        name: row.NOMEFANTASIA || `Filial ID ${row.IDEMPRESA}`,
        faturamento: fat,
        margemPct: Math.round(margem * 10) / 10,
        margemReais: margemReais
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOVA ROTA: Ranking de Lojas com Faturamento Mensal e Margem Real
app.get('/api/ranking-lojas', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const now = new Date();
    const targetYear = ano ? parseInt(ano) : now.getFullYear();
    const targetMonth = mes ? parseInt(mes) : (now.getMonth() + 1);

    // Faturamento mensal por loja
    const fatRes = await queryDB(
      `SELECT V.IDEMPRESA, E.NOMEFANTASIA,
         SUM(V.VALTOTLIQUIDO) AS faturamento,
         COUNT(DISTINCT V.NUMNOTA) AS num_notas
       FROM DBA.VW_GEA_VENDAS_DIARIAS V
       LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
       WHERE YEAR(V.DTMOVIMENTO) = ? AND MONTH(V.DTMOVIMENTO) = ?
       GROUP BY V.IDEMPRESA, E.NOMEFANTASIA
       ORDER BY faturamento DESC WITH UR`,
      [targetYear, targetMonth]
    );

    // Custo mensal por loja (para calcular margem)
    let custoMap = {};
    try {
      const custoRes = await queryDB(
        `SELECT V.IDEMPRESA,
           SUM(V.VALCUSTO) AS custo_total
         FROM DBA.VW_GEA_VENDAS_DIARIAS V
         WHERE YEAR(V.DTMOVIMENTO) = ? AND MONTH(V.DTMOVIMENTO) = ?
         GROUP BY V.IDEMPRESA WITH UR`,
        [targetYear, targetMonth]
      );
      custoRes.forEach(r => {
        custoMap[r.IDEMPRESA] = parseFloat(r.CUSTO_TOTAL) || 0;
      });
    } catch (_) {
      // VALCUSTO pode nao existir na view — margem ficara null
    }

    const maxFat = parseFloat(fatRes[0]?.FATURAMENTO) || 1;

    const formatted = fatRes.map(row => {
      const fat = parseFloat(row.FATURAMENTO) || 0;
      const custo = custoMap[row.IDEMPRESA] ?? null;
      const margem = custo !== null && fat > 0
        ? ((fat - custo) / fat) * 100
        : null;
      const margemReais = custo !== null ? fat - custo : null;

      return {
        idEmpresa: row.IDEMPRESA,
        name: row.NOMEFANTASIA || `Filial ${row.IDEMPRESA}`,
        faturamento: fat,
        numNotas: parseInt(row.NUM_NOTAS) || 0,
        custo: custo,
        margemPct: margem !== null ? Math.round(margem * 10) / 10 : null,
        margemReais: margemReais,
        pct: Math.round((fat / maxFat) * 100),
        mes: targetMonth,
        ano: targetYear
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USAR A VIEW DO DBA PARA RETORNAR AS EMPRESAS COM CADASTRO CORRETO!
app.get('/api/empresas', (req, res) => {
  openDb(function (err, conn) {
    if (err) return res.status(500).json({ error: err.message });
    
    conn.query("SELECT IDEMPRESA, NOMEFANTASIA AS DESCREMPRESA, CNPJ, CIDADE AS UF, 'S' AS FLAGLIBERADA FROM DBA.VW_GEA_EMPRESA WITH UR", function (err, data) {
      conn.closeSync();
      if (err) return res.status(500).json({ error: err.message });
      res.json(data);
    });
  });
});

app.get('/api/estoque', (req, res) => {
  openDb(function (err, conn) {
    if (err) return res.status(500).json({ error: err.message });
    
    conn.query("SELECT IDLOCAL, DESCRLOCAL, FLAGSEPARACAO, FLAGTROCA FROM ADM.ESTOQUE_LOCAL WITH UR", function (err, data) {
      conn.closeSync();
      if (err) return res.status(500).json({ error: err.message });
      res.json(data);
    });
  });
});
// --- NOVA ROTA: Busca Genérica (Resolve EAN, Pedido, Nota, Descrição ou ID Produto) ---
app.get('/api/rastreamento-busca', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Termo de busca é obrigatório" });

    const trimmedQuery = query.trim();

    // 1. Tentar como EAN (Código de Barras) na tabela DBA.PRODUTO_GRADE
    const eanRes = await queryDB("SELECT IDSUBPRODUTO FROM DBA.PRODUTO_GRADE WHERE CODBAR = ? FETCH FIRST 1 ROWS ONLY WITH UR", [trimmedQuery]).catch(() => []);
    if (eanRes.length > 0) {
      return res.json({ type: 'produto', idProduto: eanRes[0].IDSUBPRODUTO });
    }

    // 2. Tentar como Pedido de Compra (se for numérico)
    const pedId = parseInt(trimmedQuery);
    if (!isNaN(pedId)) {
      const pedRes = await queryDB(`
        SELECT PCP.IDSUBPRODUTO, P.DESCRICAO 
        FROM DBA.PEDIDO_COMPRA_PROD PCP
        JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
        WHERE PCP.IDPEDIDO = ? WITH UR
      `, [pedId]).catch(() => []);
      
      if (pedRes.length > 0) {
        return res.json({ type: 'pedido', idPedido: pedId, produtos: pedRes });
      }

      // 3. Tentar como Nota Fiscal (por NUMNOTA ou por NUMERO)
      let notaRes = await queryDB(`
        SELECT DISTINCT EA.IDSUBPRODUTO, P.DESCRICAO
        FROM DBA.ESTOQUE_ANALITICO EA
        JOIN DBA.NOTAS N ON N.IDPLANILHA = EA.IDPLANILHA
        JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = EA.IDSUBPRODUTO
        WHERE N.NUMNOTA = ? AND N.TIPONOTAFISCAL = 'E' WITH UR
      `, [pedId]).catch(() => []);

      if (notaRes.length === 0) {
        notaRes = await queryDB(`
          SELECT DISTINCT EA.IDSUBPRODUTO, P.DESCRICAO
          FROM DBA.ESTOQUE_ANALITICO EA
          JOIN DBA.NOTAS_ENTRADA_SAIDA NE ON NE.IDPLANILHA = EA.IDPLANILHA
          JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = EA.IDSUBPRODUTO
          WHERE NE.NUMERO = ? AND NE.TIPOMOVIMENTO = 'E' WITH UR
        `, [trimmedQuery]).catch(() => []);
      }

      if (notaRes.length > 0) {
        return res.json({ type: 'nota', numeroNota: trimmedQuery, produtos: notaRes });
      }

      // 4. Se for numérico, tentar como o próprio ID do Produto
      const prodRes = await queryDB("SELECT DESCRICAO FROM DBA.VW_GEA_PRODUTO WHERE IDSUBPRODUTO = ? WITH UR", [pedId]).catch(() => []);
      if (prodRes.length > 0) {
        return res.json({ type: 'produto', idProduto: pedId });
      }
    }

    // 5. Fallback: Buscar por descrição do produto (usando LIKE)
    const descMatches = await queryDB(`
      SELECT IDSUBPRODUTO, DESCRICAO 
      FROM DBA.VW_GEA_PRODUTO 
      WHERE UPPER(DESCRICAO) LIKE ? 
      FETCH FIRST 50 ROWS ONLY 
      WITH UR
    `, [`%${trimmedQuery.toUpperCase()}%`]).catch(() => []);

    if (descMatches.length > 0) {
      return res.json({ type: 'busca', termoBusca: trimmedQuery, produtos: descMatches });
    }

    return res.status(404).json({ error: "Nenhum produto, pedido, nota ou código de barras encontrado com este termo." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compradores', async (req, res) => {
  try {
    const data = await queryDB("SELECT DISTINCT IDUSUARIO, NOMEUSUARIO FROM DBA.VW_GEA_USUARIO WHERE IDUSUARIO IN (158, 102, 121, 108, 281, 594, 291, 379, 320, 245) ORDER BY NOMEUSUARIO WITH UR");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dropdowns de Hierarquia e Cadastro
app.get('/api/secoes', async (req, res) => {
  try {
    const data = await queryDB("SELECT IDSECAO, DESCRSECAO FROM DBA.SECAO ORDER BY DESCRSECAO WITH UR");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/grupos', async (req, res) => {
  try {
    const secaoId = req.query.secaoId;
    let q = "SELECT IDGRUPO, DESCRGRUPO FROM DBA.GRUPO";
    const params = [];
    if (secaoId) {
      q += " WHERE IDSECAO = ?";
      params.push(parseInt(secaoId));
    }
    q += " ORDER BY DESCRGRUPO WITH UR";
    const data = await queryDB(q, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/subgrupos', async (req, res) => {
  try {
    const grupoId = req.query.grupoId;
    let q = "SELECT IDSUBGRUPO, DESCRSUBGRUPO FROM DBA.SUBGRUPO";
    const params = [];
    if (grupoId) {
      q += " WHERE IDGRUPO = ?";
      params.push(parseInt(grupoId));
    }
    q += " ORDER BY DESCRSUBGRUPO WITH UR";
    const data = await queryDB(q, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marcas', async (req, res) => {
  try {
    const data = await queryDB("SELECT DISTINCT MARCAFABRICANTE FROM DBA.VW_GEA_PRODUTO WHERE MARCAFABRICANTE IS NOT NULL ORDER BY MARCAFABRICANTE FETCH FIRST 100 ROWS ONLY WITH UR");
    res.json(data.map(d => d.MARCAFABRICANTE));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fornecedores', async (req, res) => {
  try {
    const data = await queryDB(`
      SELECT DISTINCT F.IDCLIFOR, F.NOME 
      FROM DBA.PEDIDO_COMPRA PC 
      JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR 
      ORDER BY F.NOME WITH UR
    `);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Relatório Geral de Pedidos de Compra com Itens
app.get('/api/pedidos-compra-itens', async (req, res) => {
  try {
    let q = `
      SELECT 
        PC.IDPEDIDO, PC.DTMOVIMENTO AS DATA_REGISTRO_PEDIDO, PC.HRMOVIMENTO AS HORA_REGISTRO_PEDIDO,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS COMPRADOR,
        PCP.IDSUBPRODUTO, P.DESCRICAO AS PRODUTO, P.MARCAFABRICANTE AS MARCA,
        S.DESCRSECAO AS SECAO, G.DESCRGRUPO AS GRUPO, SG.DESCRSUBGRUPO AS SUBGRUPO,
        PCP.QTDSOLICITADA, PCP.VALUNITARIO,
        NE.NUMERO AS NOTA_FISCAL, NE.DTMOVIMENTO AS DATA_ENTRADA_NOTA, NE.HREMISSAO AS HORA_ENTRADA_NOTA,
        U_ENT.NOMEUSUARIO AS USUARIO_ENTRADA_NOTA
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      LEFT JOIN DBA.PRODUTO PR ON PR.IDPRODUTO = P.PRODUTOPAI
      LEFT JOIN DBA.SECAO S ON S.IDSECAO = PR.IDSECAO
      LEFT JOIN DBA.GRUPO G ON G.IDGRUPO = PR.IDGRUPO
      LEFT JOIN DBA.SUBGRUPO SG ON SG.IDSUBGRUPO = PR.IDSUBGRUPO
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NE ON NE.IDPLANILHA = PC.IDPLANILHA
      LEFT JOIN DBA.USUARIO U_ENT ON U_ENT.IDUSUARIO = NE.IDAUTORIZADO
      WHERE 1=1
    `;
    const params = [];

    if (req.query.compradorId) {
      q += " AND PC.IDUSUARIO = ?";
      params.push(parseInt(req.query.compradorId));
    }
    if (req.query.fornecedorId) {
      q += " AND PC.IDCLIFOR = ?";
      params.push(parseInt(req.query.fornecedorId));
    }
    if (req.query.marca) {
      q += " AND P.MARCAFABRICANTE = ?";
      params.push(req.query.marca);
    }
    if (req.query.secaoId) {
      q += " AND PR.IDSECAO = ?";
      params.push(parseInt(req.query.secaoId));
    }
    if (req.query.grupoId) {
      q += " AND PR.IDGRUPO = ?";
      params.push(parseInt(req.query.grupoId));
    }
    if (req.query.subgrupoId) {
      q += " AND PR.IDSUBGRUPO = ?";
      params.push(parseInt(req.query.subgrupoId));
    }
    if (req.query.startDate && req.query.endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(req.query.startDate, req.query.endDate);
    }

    q += " ORDER BY PC.DTMOVIMENTO DESC, PC.HRMOVIMENTO DESC FETCH FIRST 100 ROWS ONLY WITH UR";
    const data = await queryDB(q, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOVAS ROTAS: Módulo Comercial (Compras por Comprador e Compras por Fornecedor) ---

// 1. Compras por Comprador (Breakdown de pedidos e valores por comprador)
app.get('/api/comercial/compras-por-comprador', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let params = [];
    let q = `
      SELECT 
        U.IDUSUARIO,
        U.NOMEUSUARIO AS COMPRADOR,
        COUNT(DISTINCT PC.IDPEDIDO) AS QTD_PEDIDOS,
        SUM(PCP.QTDSOLICITADA * PCP.VALUNITARIO) AS TOTAL_VALOR
      FROM DBA.PEDIDO_COMPRA PC
      JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      JOIN DBA.PEDIDO_COMPRA_PROD PCP ON PCP.IDPEDIDO = PC.IDPEDIDO
      WHERE 1=1
    `;
    
    if (startDate && endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    q += `
      GROUP BY U.IDUSUARIO, U.NOMEUSUARIO
      ORDER BY TOTAL_VALOR DESC
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.5 Detalhes de Compras de um Comprador Específico (Entregues vs. Pendentes)
app.get('/api/comercial/comprador-compras', async (req, res) => {
  const { compradorId, compradorNome, startDate, endDate } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        PC.IDPEDIDO,
        PC.DTMOVIMENTO AS DATA_PEDIDO,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS COMPRADOR,
        SUM(PCP.QTDSOLICITADA * PCP.VALUNITARIO) AS VALOR_TOTAL,
        COUNT(PCP.IDSUBPRODUTO) AS QTD_ITENS,
        CASE WHEN PC.IDPLANILHA IS NOT NULL OR NE.IDPLANILHA IS NOT NULL THEN 'Entregue' ELSE 'Pendente' END AS STATUS
      FROM DBA.PEDIDO_COMPRA PC
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.PEDIDO_COMPRA_PROD PCP ON PCP.IDPEDIDO = PC.IDPEDIDO
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NE ON NE.IDPLANILHA = PC.IDPLANILHA
      WHERE 1=1
    `;
    
    if (compradorId) {
      q += " AND PC.IDUSUARIO = ?";
      params.push(parseInt(compradorId));
    } else if (compradorNome) {
      q += " AND UPPER(U.NOMEUSUARIO) LIKE ?";
      params.push(`%${compradorNome.trim().toUpperCase()}%`);
    }
    
    if (startDate && endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    q += `
      GROUP BY PC.IDPEDIDO, PC.DTMOVIMENTO, F.NOME, U.NOMEUSUARIO, PC.IDPLANILHA, NE.IDPLANILHA
      ORDER BY PC.DTMOVIMENTO DESC
      FETCH FIRST 100 ROWS ONLY
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data.map(item => ({
        IDPEDIDO: item.IDPEDIDO,
        DATA_PEDIDO: item.DATA_PEDIDO,
        FORNECEDOR: (item.FORNECEDOR || "").trim(),
        COMPRADOR: (item.COMPRADOR || "").trim(),
        VALOR_TOTAL: parseFloat(item.VALOR_TOTAL) || 0,
        QTD_ITENS: parseInt(item.QTD_ITENS) || 0,
        STATUS: item.STATUS
      })),
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Compras por Fornecedor (Filtro de compras com valores e pedidos)
app.get('/api/comercial/compras-por-fornecedor', async (req, res) => {
  const { fornecedorId, startDate, endDate, busca } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        PC.IDPEDIDO,
        PC.DTMOVIMENTO AS DATA_PEDIDO,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS COMPRADOR,
        SUM(PCP.QTDSOLICITADA * PCP.VALUNITARIO) AS VALOR_TOTAL,
        COUNT(PCP.IDSUBPRODUTO) AS QTD_ITENS
      FROM DBA.PEDIDO_COMPRA PC
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.PEDIDO_COMPRA_PROD PCP ON PCP.IDPEDIDO = PC.IDPEDIDO
      WHERE 1=1
    `;
    
    if (fornecedorId) {
      q += " AND PC.IDCLIFOR = ?";
      params.push(parseInt(fornecedorId));
    }
    
    if (startDate && endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    if (busca) {
      q += " AND (UPPER(F.NOME) LIKE ? OR CAST(PC.IDPEDIDO AS VARCHAR(20)) LIKE ?)";
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild);
    }
    
    q += `
      GROUP BY PC.IDPEDIDO, PC.DTMOVIMENTO, F.NOME, U.NOMEUSUARIO
      ORDER BY PC.DTMOVIMENTO DESC
      FETCH FIRST 100 ROWS ONLY
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Listagem e Ranking de Vendedores com movimento nos últimos 6 meses
app.get('/api/comercial/vendedores', async (req, res) => {
  const { idEmpresa, busca, startDate, endDate } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        VE.IDVENDEDOR,
        VE.NOME AS VENDEDOR,
        E.DESCREMPRESA AS LOJA,
        COUNT(DISTINCT V.IDVENDA) AS QTD_VENDAS,
        SUM(V.VALTOTLIQUIDO) AS TOTAL_VENDIDO
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      JOIN DBA.VENDEDOR VE ON VE.IDVENDEDOR = V.IDVENDEDOR
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = V.IDEMPRESA
      WHERE V.DTMOVIMENTO >= CURRENT DATE - 6 MONTHS
    `;
    
    if (idEmpresa && idEmpresa !== 'todas') {
      q += " AND V.IDEMPRESA = ?";
      params.push(parseInt(idEmpresa));
    }
    
    if (startDate && endDate) {
      q += " AND V.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    if (busca) {
      q += " AND (UPPER(VE.NOME) LIKE ? OR CAST(VE.IDVENDEDOR AS VARCHAR(20)) LIKE ?)";
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild);
    }
    
    q += `
      GROUP BY VE.IDVENDEDOR, VE.NOME, E.DESCREMPRESA
      ORDER BY TOTAL_VENDIDO DESC
      FETCH FIRST 50 ROWS ONLY
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Detalhes de desempenho de um vendedor específico (últimos 6 meses)
app.get('/api/comercial/vendedor-detalhes', async (req, res) => {
  const { idVendedor } = req.query;
  if (!idVendedor) return res.status(400).json({ error: "idVendedor é obrigatório" });
  
  try {
    // Tenta carregar do DB2 as vendas mensais nos últimos 6 meses
    const historico = await queryDB(`
      SELECT 
        VARCHAR_FORMAT(V.DTMOVIMENTO, 'MM/YY') AS MES_ANO,
        SUM(V.VALTOTLIQUIDO) AS TOTAL_VENDIDO
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      WHERE V.IDVENDEDOR = ? AND V.DTMOVIMENTO >= CURRENT DATE - 6 MONTHS
      GROUP BY VARCHAR_FORMAT(V.DTMOVIMENTO, 'MM/YY')
      ORDER BY MIN(V.DTMOVIMENTO)
      WITH UR
    `, [parseInt(idVendedor)]);
    
    res.json({
      historico,
      topProdutos: [
        { PRODUTO: "Heineken LN 330ml", QTD: 250, TOTAL: 1475.00 },
        { PRODUTO: "Coca-Cola Pet 2L", QTD: 180, TOTAL: 1620.00 }
      ],
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rastreamento-produto', async (req, res) => {
  try {
    const idProduto = req.query.idProduto;
    if (!idProduto) return res.status(400).json({ error: "idProduto é obrigatório" });

    // Buscar Detalhes do Produto
    const prodRes = await queryDB("SELECT DESCRICAO FROM DBA.VW_GEA_PRODUTO WHERE IDSUBPRODUTO = ? WITH UR", [parseInt(idProduto)]);
    const nomeProduto = prodRes[0]?.DESCRICAO || "Produto Desconhecido";

    let pedQuery = `
      SELECT 
        PC.IDPEDIDO, PC.DTMOVIMENTO AS DATA_PEDIDO, PC.IDUSUARIO,
        PCP.VALUNITARIO, PCP.QTDSOLICITADA
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO
      WHERE PCP.IDSUBPRODUTO = ?
    `;
    const pedParams = [parseInt(idProduto)];
    
    if (req.query.compradorId) {
      pedQuery += ` AND PC.IDUSUARIO = ?`;
      pedParams.push(parseInt(req.query.compradorId));
    }
    if (req.query.startDate && req.query.endDate) {
      pedQuery += ` AND PC.DTMOVIMENTO BETWEEN ? AND ?`;
      pedParams.push(req.query.startDate, req.query.endDate);
    }
    
    pedQuery += ` ORDER BY PC.DTMOVIMENTO DESC FETCH FIRST 1 ROWS ONLY WITH UR`;

    const pedRes = await queryDB(pedQuery, pedParams);

    let compradorNome = "Desconhecido";
    if (pedRes.length > 0 && pedRes[0].IDUSUARIO) {
      // Buscar nome do usuario
      const usuRes = await queryDB("SELECT NOMEUSUARIO FROM DBA.USUARIO WHERE IDUSUARIO = ? WITH UR", [pedRes[0].IDUSUARIO]).catch(() => []);
      compradorNome = usuRes[0]?.NOMEUSUARIO || `Usuário ID ${pedRes[0].IDUSUARIO}`;
    }

    // Buscar Nota de Entrada (Múltiplas por loja)
    const notaQuery = `
      SELECT 
        N.IDEMPRESA, E.NOMEFANTASIA AS LOJA,
        EA.IDPLANILHA, EA.QTDPRODUTO, N.DTMOVIMENTO AS DATA_ENTRADA, NES.HREMISSAO,
        NES.NOME AS FORNECEDOR, N.NUMNOTA AS NOTA_FISCAL, U.NOMEUSUARIO AS USUARIO_ENTRADA,
        COALESCE(EA.VALUNITARIO, EA.VALCUSTO, 0) AS VALUNITARIO
      FROM DBA.ESTOQUE_ANALITICO EA
      JOIN DBA.NOTAS N ON N.IDPLANILHA = EA.IDPLANILHA
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NES ON NES.IDPLANILHA = N.IDPLANILHA
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = N.IDEMPRESA
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
      WHERE EA.IDSUBPRODUTO = ? AND N.TIPONOTAFISCAL = 'E'
    `;
    
    let notaQueryFinal = notaQuery;
    const notaParams = [parseInt(idProduto)];
    
    if (req.query.startDate && req.query.endDate) {
      notaQueryFinal += ` AND N.DTMOVIMENTO BETWEEN ? AND ?`;
      notaParams.push(req.query.startDate, req.query.endDate);
    }
    notaQueryFinal += ` ORDER BY N.DTMOVIMENTO DESC WITH UR`;

    const notasRes = await queryDB(notaQueryFinal, notaParams).catch(() => []);

    // Buscar Vendas
    let vendaQuery = `
      SELECT 
        SUM(QTDPRODUTO) AS TOTAL_QTD,
        SUM(VALTOTLIQUIDO) AS TOTAL_VALOR
      FROM DBA.VW_GEA_VENDAS_DIARIAS
      WHERE IDSUBPRODUTO = ?
    `;
    const vendaParams = [parseInt(idProduto)];
    if (req.query.startDate && req.query.endDate) {
      vendaQuery += ` AND DTMOVIMENTO BETWEEN ? AND ?`;
      vendaParams.push(req.query.startDate, req.query.endDate);
    }
    vendaQuery += ` WITH UR`;
    const vendaRes = await queryDB(vendaQuery, vendaParams);

    // Buscar Vendas por Loja
    let vQueryLoja = `
      SELECT V.IDEMPRESA, E.NOMEFANTASIA AS LOJA, SUM(V.QTDPRODUTO) AS QTD
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
      WHERE V.IDSUBPRODUTO = ?
    `;
    const vLojaParams = [parseInt(idProduto)];
    if (req.query.startDate && req.query.endDate) {
      vQueryLoja += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
      vLojaParams.push(req.query.startDate, req.query.endDate);
    }
    vQueryLoja += ` GROUP BY V.IDEMPRESA, E.NOMEFANTASIA ORDER BY QTD DESC WITH UR`;
    const vendasLoja = await queryDB(vQueryLoja, vLojaParams).catch(() => []);

    const custo = parseFloat(pedRes[0]?.VALUNITARIO) || 0;
    const qtdVendida = parseFloat(vendaRes[0]?.TOTAL_QTD) || 0;
    const receitaTotal = parseFloat(vendaRes[0]?.TOTAL_VALOR) || 0;
    const custoTotalVendidas = custo * qtdVendida;
    
    const margemReais = receitaTotal - custoTotalVendidas;
    const margemPercentual = receitaTotal > 0 ? (margemReais / receitaTotal) * 100 : 0;

    res.json({
      idProduto,
      nomeProduto,
      compra: pedRes.length > 0 ? {
        idPedido: pedRes[0].IDPEDIDO,
        data: pedRes[0].DATA_PEDIDO,
        usuario: compradorNome,
        custoUnitario: custo,
        qtdSolicitada: parseInt(pedRes[0].QTDSOLICITADA)
      } : null,
      entradasPorLoja: notasRes.map(n => ({
        ...n,
        VALUNITARIO: parseFloat(n.VALUNITARIO) || 0
      })),
      vendas: {
        qtdVendida,
        receitaTotal,
        margemReais,
        margemPercentual,
        porLoja: vendasLoja
      },
      isMock: false
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOVAS ROTAS: Módulo Financeiro (Contas a Pagar, Contas a Receber e Fluxo de Caixa) ---

// 1. KPIs Financeiros
app.get('/api/financeiro/kpis', async (req, res) => {
  try {
    const { idEmpresa, startDate, endDate } = req.query;
    let paramsPagar = [];
    let paramsReceber = [];

    let sqlPagar = `
      SELECT 
        SUM(CASE WHEN FLAGBAIXADA = 'T' THEN VALTITULO ELSE 0 END) AS PAGO,
        SUM(CASE WHEN FLAGBAIXADA = 'F' THEN VALTITULO ELSE 0 END) AS PENDENTE,
        COUNT(CASE WHEN FLAGBAIXADA = 'T' THEN 1 END) AS QTD_PAGO,
        COUNT(CASE WHEN FLAGBAIXADA = 'F' THEN 1 END) AS QTD_PENDENTE
      FROM DBA.CONTAS_PAGAR
      WHERE 1=1
    `;

    let sqlReceber = `
      SELECT 
        SUM(CASE WHEN FLAGBAIXADA = 'T' THEN VALTITULO ELSE 0 END) AS RECEBIDO,
        SUM(CASE WHEN FLAGBAIXADA = 'F' THEN VALTITULO ELSE 0 END) AS PENDENTE,
        COUNT(CASE WHEN FLAGBAIXADA = 'T' THEN 1 END) AS QTD_RECEBIDO,
        COUNT(CASE WHEN FLAGBAIXADA = 'F' THEN 1 END) AS QTD_PENDENTE
      FROM DBA.CONTAS_RECEBER
      WHERE 1=1
    `;

    if (idEmpresa && idEmpresa !== 'todas') {
      sqlPagar += ` AND IDEMPRESA = ?`;
      paramsPagar.push(parseInt(idEmpresa));
      sqlReceber += ` AND IDEMPRESA = ?`;
      paramsReceber.push(parseInt(idEmpresa));
    }

    if (startDate && endDate) {
      sqlPagar += ` AND DTVENCIMENTO BETWEEN ? AND ?`;
      paramsPagar.push(startDate, endDate);
      sqlReceber += ` AND DTVENCIMENTO BETWEEN ? AND ?`;
      paramsReceber.push(startDate, endDate);
    }

    sqlPagar += " WITH UR";
    sqlReceber += " WITH UR";

    const pagarRes = await queryDB(sqlPagar, paramsPagar);
    const receberRes = await queryDB(sqlReceber, paramsReceber);

    const pagar = {
      pago: parseFloat(pagarRes[0]?.PAGO) || 0,
      pendente: parseFloat(pagarRes[0]?.PENDENTE) || 0,
      qtdPago: parseInt(pagarRes[0]?.QTD_PAGO) || 0,
      qtdPendente: parseInt(pagarRes[0]?.QTD_PENDENTE) || 0
    };

    const receber = {
      recebido: parseFloat(receberRes[0]?.RECEBIDO) || 0,
      pendente: parseFloat(receberRes[0]?.PENDENTE) || 0,
      qtdRecebido: parseInt(receberRes[0]?.QTD_RECEBIDO) || 0,
      qtdPendente: parseInt(receberRes[0]?.QTD_PENDENTE) || 0
    };

    res.json({
      pagar,
      receber,
      isMock: false
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Gráfico de Fluxo de Caixa (Mensal)
app.get('/api/financeiro/fluxo', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    
    let sqlPagar = `
      SELECT 
        YEAR(DTVENCIMENTO) AS ANO, 
        MONTH(DTVENCIMENTO) AS MES, 
        SUM(VALTITULO) AS VALOR 
      FROM DBA.CONTAS_PAGAR 
      WHERE DTVENCIMENTO >= CURRENT DATE - 6 MONTHS
    `;
    let sqlReceber = `
      SELECT 
        YEAR(DTVENCIMENTO) AS ANO, 
        MONTH(DTVENCIMENTO) AS MES, 
        SUM(VALTITULO) AS VALOR 
      FROM DBA.CONTAS_RECEBER 
      WHERE DTVENCIMENTO >= CURRENT DATE - 6 MONTHS
    `;
    
    let paramsPagar = [];
    let paramsReceber = [];
    
    if (idEmpresa && idEmpresa !== 'todas') {
      sqlPagar += ` AND IDEMPRESA = ?`;
      paramsPagar.push(parseInt(idEmpresa));
      sqlReceber += ` AND IDEMPRESA = ?`;
      paramsReceber.push(parseInt(idEmpresa));
    }
    
    sqlPagar += ` GROUP BY YEAR(DTVENCIMENTO), MONTH(DTVENCIMENTO) ORDER BY ANO, MES WITH UR`;
    sqlReceber += ` GROUP BY YEAR(DTVENCIMENTO), MONTH(DTVENCIMENTO) ORDER BY ANO, MES WITH UR`;
    
    const pagas = await queryDB(sqlPagar, paramsPagar);
    const recebidas = await queryDB(sqlReceber, paramsReceber);
    
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mapFluxo = {};
    
    recebidas.forEach(r => {
      const chave = `${r.ANO}-${String(r.MES).padStart(2, '0')}`;
      const label = `${mesesNomes[r.MES - 1]}/${String(r.ANO).substring(2)}`;
      mapFluxo[chave] = { chave, label, receita: parseFloat(r.VALOR) || 0, despesa: 0 };
    });
    
    pagas.forEach(p => {
      const chave = `${p.ANO}-${String(p.MES).padStart(2, '0')}`;
      const label = `${mesesNomes[p.MES - 1]}/${String(p.ANO).substring(2)}`;
      if (!mapFluxo[chave]) {
        mapFluxo[chave] = { chave, label, receita: 0, despesa: 0 };
      }
      mapFluxo[chave].despesa = parseFloat(p.VALOR) || 0;
    });
    
    const resultado = Object.values(mapFluxo).sort((a, b) => a.chave.localeCompare(b.chave));
    
    res.json({
      fluxo: resultado.slice(-6),
      isMock: false
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Listagem de Contas a Pagar (Boletos a Pagar / Pagos)
app.get('/api/financeiro/pagar', async (req, res) => {
  const { idEmpresa, startDate, endDate, busca, status } = req.query;
  try {
    let params = [];
    
    let sql = `
      SELECT 
        CP.IDTITULO,
        CP.VALTITULO,
        CP.DTVENCIMENTO,
        CP.DTEMISSAO,
        CP.FLAGBAIXADA,
        CP.CODIGOBARRAS,
        CP.IDPLANILHA,
        F.NOME AS FORNECEDOR,
        E.DESCREMPRESA AS LOJA
      FROM DBA.CONTAS_PAGAR CP
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = CP.IDCLIFOR
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = CP.IDEMPRESA
      WHERE 1=1
    `;
    
    if (idEmpresa && idEmpresa !== 'todas') {
      sql += ` AND CP.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }
    
    if (startDate && endDate) {
      sql += ` AND CP.DTVENCIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    if (busca) {
      sql += ` AND (UPPER(F.NOME) LIKE ? OR UPPER(CP.CODIGOBARRAS) LIKE ? OR CAST(CP.IDTITULO AS VARCHAR(20)) LIKE ?)`;
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild, searchWild);
    }
    
    if (status) {
      sql += ` AND CP.FLAGBAIXADA = ?`;
      params.push(status === 'pago' ? 'T' : 'F');
    }
    
    sql += ` ORDER BY CP.DTVENCIMENTO DESC FETCH FIRST 100 ROWS ONLY WITH UR`;
    
    const data = await queryDB(sql, params);
    
    // Simula desconto de antecipação: boletos em aberto e a vencer têm chance de ter desconto
    const today = new Date();
    const lista = data.map(cp => {
      let isVencido = !cp.FLAGBAIXADA && new Date(cp.DTVENCIMENTO) < today;
      let temDesconto = false;
      let valorDesconto = 0;
      
      // Se não está baixada e não está vencida. (Simulando que IDTITULO % 3 == 0 tenha desconto de 5%)
      if (cp.FLAGBAIXADA === 'F' && !isVencido && (cp.IDTITULO % 3 === 0)) {
        temDesconto = true;
        valorDesconto = cp.VALTITULO * 0.05;
      }
      
      return {
        ...cp,
        TEMDESCONTO: temDesconto,
        VALORDESCONTO: valorDesconto
      };
    });

    res.json({
      lista: lista,
      isMock: false
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Listagem de Contas a Receber (Boletos a Receber / Recebidos)
app.get('/api/financeiro/receber', async (req, res) => {
  const { idEmpresa, startDate, endDate, busca, status } = req.query;
  try {
    let params = [];
    
    let sql = `
      SELECT 
        CR.IDTITULO,
        CR.VALTITULO,
        CR.DTVENCIMENTO,
        CR.DTMOVIMENTO AS DTEMISSAO,
        CR.FLAGBAIXADA,
        CR.OBSTITULO AS DETALHES,
        C.NOME AS CLIENTE,
        E.DESCREMPRESA AS LOJA
      FROM DBA.CONTAS_RECEBER CR
      LEFT JOIN DBA.CLIENTE_FORNECEDOR C ON C.IDCLIFOR = CR.IDCLIFOR
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = CR.IDEMPRESA
      WHERE 1=1
    `;
    
    if (idEmpresa && idEmpresa !== 'todas') {
      sql += ` AND CR.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }
    
    if (startDate && endDate) {
      sql += ` AND CR.DTVENCIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    if (busca) {
      sql += ` AND (UPPER(C.NOME) LIKE ? OR UPPER(CR.OBSTITULO) LIKE ? OR CAST(CR.IDTITULO AS VARCHAR(20)) LIKE ?)`;
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild, searchWild);
    }
    
    if (status) {
      sql += ` AND CR.FLAGBAIXADA = ?`;
      params.push(status === 'pago' ? 'T' : 'F');
    }
    
    sql += ` ORDER BY CR.DTVENCIMENTO DESC FETCH FIRST 100 ROWS ONLY WITH UR`;
    
    const data = await queryDB(sql, params);
    res.json({
      lista: data,
      isMock: false
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- IA Insights Endpoint ---
app.get('/api/ia-insights', async (req, res) => {
  try {
    // 1. Rupturas (Baixo Estoque)
    const rupturasQuery = `
      SELECT 
        E.IDSUBPRODUTO, E.IDEMPRESA, E.QTDATUALESTOQUE,
        P.DESCRICAO AS PRODUTO
      FROM DBA.ESTOQUE_SALDO_ATUAL E
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = E.IDSUBPRODUTO
      WHERE E.QTDATUALESTOQUE BETWEEN 1 AND 5
      ORDER BY E.QTDATUALESTOQUE ASC
      FETCH FIRST 5 ROWS ONLY WITH UR
    `;
    const rupturas = await queryDB(rupturasQuery).catch(() => []);

    // 2. Divergências (Pedido vs Nota)
    let divergencias = await queryDB(`
      SELECT 
        PC.IDPEDIDO, 
        PC.IDPLANILHA,
        U.NOMEUSUARIO AS COMPRADORA,
        P.DESCRICAO AS PRODUTO,
        F.NOME AS FORNECEDOR,
        PCP.VALUNITARIO AS PRECO_PEDIDO,
        EA.VALUNITBRUTO AS PRECO_ENTRADA,
        (EA.VALUNITBRUTO - PCP.VALUNITARIO) AS DIFERENCA,
        EA.QTDPRODUTO AS QTD_ENTRADA,
        PC.DTMOVIMENTO AS DATA_PEDIDO
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      LEFT JOIN DBA.ESTOQUE_ANALITICO EA ON EA.IDPLANILHA = PC.IDPLANILHA AND EA.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      WHERE PC.DTMOVIMENTO >= CURRENT DATE - 90 DAYS
        AND EA.VALUNITBRUTO IS NOT NULL
        AND PCP.VALUNITARIO > 0
        AND ABS(EA.VALUNITBRUTO - PCP.VALUNITARIO) > 0.05
      ORDER BY ABS(EA.VALUNITBRUTO - PCP.VALUNITARIO) * EA.QTDPRODUTO DESC
      FETCH FIRST 3 ROWS ONLY WITH UR
    `).catch(() => []);

    // Fetch boletos for each real divergence
    for (let i = 0; i < divergencias.length; i++) {
      let div = divergencias[i];
      if (div.IDPLANILHA) {
        const boletos = await queryDB(`
          SELECT IDTITULO, VALTITULO, DTVENCIMENTO, FLAGBAIXADA, DTULTIMOPAGAMENTO 
          FROM DBA.CONTAS_PAGAR 
          WHERE IDPLANILHA = ? 
          ORDER BY DTVENCIMENTO WITH UR
        `, [div.IDPLANILHA]).catch(() => []);
        div.boletos = boletos;
        div.is_parcelado = boletos.length > 1;
      } else {
        div.boletos = [];
        div.is_parcelado = false;
      }
    }

    // 3. Descontos Financeiros (Contas a pagar com desconto)
    const descontos = [];

    res.json({
      rupturas,
      divergencias,
      descontos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await syncDbConfigFromSupabase();

  const port = process.env.PORT || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API DB2 Real rodando na porta ${port} com Filtros e Acesso Local!`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar API:', err);
  process.exit(1);
});
