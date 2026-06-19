const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, function (err, conn) {
  if (err) return console.log(err);
  conn.query("SELECT TABSCHEMA, TABNAME FROM SYSCAT.TABLES WHERE TABNAME LIKE '%AVARIA%' OR TABNAME LIKE '%TROCA%' WITH UR", function (err, data) {
    conn.closeSync();
    if (err) return console.log(err);
    console.log(data);
  });
});
