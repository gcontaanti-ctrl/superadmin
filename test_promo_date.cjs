const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT COUNT(*) as qtd FROM DBA.VW_GEA_VENDAS_DIARIAS V WHERE V.DTMOVIMENTO BETWEEN '2026-05-17' AND '2026-06-16' AND V.PROMOCAO IN ('S', '1') WITH UR", (err, data) => {
    if (err) { console.error(err); } else { console.log("QTD PROMO: ", data); }
    conn.close();
  });
});
