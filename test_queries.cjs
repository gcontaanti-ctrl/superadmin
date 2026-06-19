const ibmdb = require('ibm_db');
const fs = require('fs');

const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

async function run() {
  let conn;
  try {
    conn = await ibmdb.open(connStr);
    console.log("Connected to DB2");

    async function query(name, sql) {
      try {
        const res = await conn.query(sql);
        console.log(`[${name}] OK =>`, res.length, "rows. First:", res[0]);
      } catch (err) {
        console.error(`[${name}] ERROR =>`, err.message);
      }
    }

    const maxDate = '2026-05-19';
    const currentYear = 2026;
    const currentMonth = 5;
    
    await query("Faturamento Hoje", `SELECT SUM(VALTOTLIQUIDO) AS fat_hoje, COUNT(DISTINCT NUMNOTA) AS notas_hoje, COUNT(DISTINCT NUMNOTA) AS clientes_hoje FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO = '${maxDate}' WITH UR`);
    await query("Faturamento Mes", `SELECT SUM(VALTOTLIQUIDO) AS fat_mes, COUNT(DISTINCT NUMNOTA) AS notas_mes FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE YEAR(DTMOVIMENTO) = ${currentYear} AND MONTH(DTMOVIMENTO) = ${currentMonth} WITH UR`);
    await query("Lucro", `SELECT SUM(LUCRO * QTDPRODUTO) AS lucro_mes, SUM(CUSTOGERENCIAL * QTDPRODUTO) AS custo_mes FROM DBA.ESTOQUE_ANA_HIST_LUCRO_VW WHERE YEAR(DTMOVIMENTO) = ${currentYear} AND MONTH(DTMOVIMENTO) = ${currentMonth} WITH UR`);
    await query("Estoque_1", `SELECT COUNT(*) AS total_estoque, SUM(CASE WHEN SALDODISPONIVEL <= 0 THEN 1 ELSE 0 END) AS sem_estoque FROM ADM.ESTOQUE_LOCAL WITH UR`);
    await query("Estoque_2", `SELECT COUNT(*) AS total_estoque FROM ADM.ESTOQUE_LOCAL WITH UR`);
    await query("Top Prod", `SELECT P.DESCRICAO AS nome, SUM(V.VALTOTLIQUIDO) AS total FROM DBA.VW_GEA_VENDAS_DIARIAS V LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO WHERE YEAR(V.DTMOVIMENTO) = ${currentYear} AND MONTH(V.DTMOVIMENTO) = ${currentMonth} GROUP BY P.DESCRICAO ORDER BY total DESC FETCH FIRST 10 ROWS ONLY WITH UR`);

  } catch (e) {
    console.error("Connection error:", e.message);
  } finally {
    if (conn) conn.closeSync();
  }
}

run();
