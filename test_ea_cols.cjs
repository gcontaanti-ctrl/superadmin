const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT * FROM DBA.ESTOQUE_ANALITICO FETCH FIRST 1 ROWS ONLY WITH UR", (err, data) => {
    if (err) { console.error(err); } else { console.log(data[0] ? Object.keys(data[0]) : 'Empty'); }
    conn.close();
  });
});
