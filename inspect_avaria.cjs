const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, function (err, conn) {
  if (err) return console.log(err);
  conn.query("SELECT * FROM DBA.AVARIA FETCH FIRST 1 ROWS ONLY WITH UR", function (err, data) {
    if (err) console.log("Erro DBA.AVARIA", err.message);
    else console.log("DBA.AVARIA:", data.length ? Object.keys(data[0]) : "vazio");

    conn.query("SELECT * FROM DBA.AVARIA_MOVIMENTO FETCH FIRST 1 ROWS ONLY WITH UR", function (err, data2) {
      conn.closeSync();
      if (err) console.log("Erro DBA.AVARIA_MOVIMENTO", err.message);
      else console.log("DBA.AVARIA_MOVIMENTO:", data2.length ? Object.keys(data2[0]) : "vazio");
    });
  });
});
