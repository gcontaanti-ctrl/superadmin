const ibmdb = require('ibm_db');
const path = require('path');
const fs = require('fs');

const cfgLocal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.runtime', 'db-config.json'), 'utf8'));
const cs = `DATABASE=${cfgLocal.database};HOSTNAME=${cfgLocal.hostname};PORT=${cfgLocal.port};PROTOCOL=TCPIP;UID=${cfgLocal.uid};PWD=${cfgLocal.pwd};ConnectTimeout=30;`;

ibmdb.open(cs, async (err, conn) => {
  if (err) return console.error(err);
  
  const query = (sql, params = []) => new Promise((resolve, reject) => {
    conn.query(sql, params, (e, res) => e ? reject(e) : resolve(res));
  });

  try {
    const t0 = Date.now();
    // Get max date
    const maxDateRes = await query("SELECT MAX(DTMOVIMENTO) AS MAX_DATE FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    const maxDateStr = maxDateRes[0]?.MAX_DATE || '2026-07-20';
    console.log("Max date:", maxDateStr);

    const vendasRes = await query(`
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
      GROUP BY IDEMPRESA, IDSUBPRODUTO
      FETCH FIRST 10 ROWS ONLY
      WITH UR
    `);

    console.log(`Query completed in ${Date.now() - t0}ms! Sample sales aggregation:`, vendasRes);

  } catch(e) {
    console.error("VENDAS PERF ERR:", e.message);
  } finally {
    conn.closeSync();
  }
});
