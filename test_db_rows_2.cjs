const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT IDTITULO, VALTITULO, SUMVALDESCCONCEDIDOTITULO, DTVENCIMENTO FROM DBA.CONTAS_PAGAR WHERE FLAGBAIXADA='F' AND SUMVALDESCCONCEDIDOTITULO > 0 FETCH FIRST 5 ROWS ONLY", (err, data) => {
    console.log(data);
    conn.closeSync();
  });
});
