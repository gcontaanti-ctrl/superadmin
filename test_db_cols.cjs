const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT COLNAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='LOG_REQUEST_RECEPCAO_NOTA' ORDER BY COLNAME", (err, data) => {
    if (err) console.error(err);
    else console.log("Columns of LOG_REQUEST_RECEPCAO_NOTA:", data.map(d => d.COLNAME));
    conn.closeSync();
  });
});
