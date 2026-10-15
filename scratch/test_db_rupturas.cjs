const ibmdb = require('ibm_db');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const dbConfig = {
  database: process.env.DB2_DATABASE || 'cisserp',
  hostname: process.env.DB2_HOSTNAME || '192.168.20.20',
  port: process.env.DB2_PORT || '30231',
  protocol: process.env.DB2_PROTOCOL || 'TCPIP',
  uid: process.env.DB2_UID || 'contabilidade',
  pwd: process.env.DB2_PWD || '',
  connectTimeout: '30'
};

try {
  const cfgLocal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.runtime', 'db-config.json'), 'utf8'));
  Object.assign(dbConfig, cfgLocal);
} catch(e) {}

const cs = `DATABASE=${dbConfig.database};HOSTNAME=${dbConfig.hostname};PORT=${dbConfig.port};PROTOCOL=TCPIP;UID=${dbConfig.uid};PWD=${dbConfig.pwd};ConnectTimeout=30;`;

console.log("Connecting to DB2...");
ibmdb.open(cs, async (err, conn) => {
  if (err) {
    console.error("DB2 Connection error:", err.message);
    return;
  }
  console.log("DB2 Connected Successfully!");

  const query = (sql, params = []) => new Promise((resolve, reject) => {
    conn.query(sql, params, (e, res) => e ? reject(e) : resolve(res));
  });

  try {
    // 1. Check Empresas
    const empresas = await query("SELECT IDEMPRESA, NOMEFANTASIA, RAZAOSOCIAL FROM DBA.VW_GEA_EMPRESA WITH UR");
    console.log("\n--- EMPRESAS ---", empresas.length, empresas.slice(0, 3));

    // 2. Check Estoque Saldo Sample
    const estoque = await query("SELECT IDEMPRESA, IDSUBPRODUTO, QTDATUALESTOQUE, VALCUSTOMEDIO, VALVENDA, DTULTIMAVENDA FROM DBA.ESTOQUE_SALDO_ATUAL FETCH FIRST 5 ROWS ONLY WITH UR");
    console.log("\n--- ESTOQUE SALDO SAMPLE ---", estoque);

    // 3. Check Vendas Diarias MAX date and sample
    const maxDate = await query("SELECT MAX(DTMOVIMENTO) AS MAX_DATE FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    console.log("\n--- MAX DATE VENDAS ---", maxDate);

    // 4. Check Sample Vendas per Product
    const vendasSample = await query(`
      SELECT IDEMPRESA, IDSUBPRODUTO, SUM(QTDPRODUTO) AS QTD_30D, SUM(VALTOTLIQUIDO) AS VALOR_30D
      FROM DBA.VW_GEA_VENDAS_DIARIAS
      WHERE DTMOVIMENTO >= '2026-04-01'
      GROUP BY IDEMPRESA, IDSUBPRODUTO
      FETCH FIRST 5 ROWS ONLY WITH UR
    `);
    console.log("\n--- VENDAS SAMPLE ---", vendasSample);

    // 5. Check Produto / Subproduto details
    const prodSample = await query(`
      SELECT S.IDSUBPRODUTO, P.DESCRICAO, P.IDGRUPO, G.DESCRGRUPO AS CATEGORIA, M.DESCRMARCA AS MARCA, F.NOMEFANTASIA AS FORNECEDOR
      FROM DBA.PRODUTO_GRADE S
      JOIN DBA.PRODUTO P ON P.IDPRODUTO = S.IDPRODUTO
      LEFT JOIN DBA.PRODUTO_GRUPO G ON G.IDGRUPO = P.IDGRUPO
      LEFT JOIN DBA.PRODUTO_MARCA M ON M.IDMARCA = P.IDMARCA
      LEFT JOIN DBA.PESSOA F ON F.IDPESSOA = P.IDFORNECEDORPRINCIPAL
      FETCH FIRST 5 ROWS ONLY WITH UR
    `).catch(async () => {
       return await query(`SELECT IDSUBPRODUTO, DESCRICAO FROM DBA.VW_GEA_PRODUTO FETCH FIRST 5 ROWS ONLY WITH UR`).catch(e => e.message);
    });
    console.log("\n--- PRODUTO SAMPLE ---", prodSample);

  } catch(e) {
    console.error("Query Error:", e.message);
  } finally {
    conn.closeSync();
  }
});
