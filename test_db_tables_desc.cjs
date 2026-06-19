const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA='DBA' AND TABNAME LIKE '%DESC%'", (err, data) => {
    console.log(data);
    conn.closeSync();
  });
});
