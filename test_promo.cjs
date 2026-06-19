const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT PROMOCAO, COUNT(*) as qtd FROM DBA.VW_GEA_VENDAS_DIARIAS GROUP BY PROMOCAO FETCH FIRST 10 ROWS ONLY WITH UR", (err, data) => {
    if (err) { console.error(err); } else { console.log("VW_GEA_VENDAS_DIARIAS PROMOCAO values:", data); }
    conn.close();
  });
});
