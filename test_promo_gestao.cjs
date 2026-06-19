const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT * FROM DBA.PROMOCAO_GESTAO FETCH FIRST 1 ROWS ONLY WITH UR", (err, data) => {
    if (err) { console.error(err); } else { console.log("PROMOCAO_GESTAO:", data[0] ? Object.keys(data[0]) : 'Empty'); }
    conn.query("SELECT * FROM DBA.PROMOCAO_GESTAO_PRODUTO FETCH FIRST 1 ROWS ONLY WITH UR", (err2, data2) => {
      if (err2) { console.error(err2); } else { console.log("PROMOCAO_GESTAO_PRODUTO:", data2[0] ? Object.keys(data2[0]) : 'Empty'); }
      conn.close();
    });
  });
});
