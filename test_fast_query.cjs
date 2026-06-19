const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  let sql = `
    SELECT 
      SUM(VALTOTLIQUIDO) AS RECEITA,
      SUM(QTDPRODUTO) AS QTD
    FROM DBA.VW_GEA_VENDAS_DIARIAS
    WHERE IDSUBPRODUTO IN (1234, 5678, 9012)
    AND DTMOVIMENTO BETWEEN '2026-05-01' AND '2026-06-16'
    WITH UR
  `;
  conn.query(sql, (err, data) => {
    if (err) { console.error(err); } else { console.log(data); }
    conn.close();
  });
});
