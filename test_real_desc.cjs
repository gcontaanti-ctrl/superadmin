const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }

  // Check CONTAS_PAGAR_REMESSA for discount > 0
  conn.query("SELECT R.IDTITULO, R.VALDESCONTO, R.DTMOVIMENTO, CP.VALTITULO, CP.DTVENCIMENTO FROM DBA.CONTAS_PAGAR_REMESSA R LEFT JOIN DBA.CONTAS_PAGAR CP ON CP.IDTITULO = R.IDTITULO WHERE R.VALDESCONTO > 0 AND CP.FLAGBAIXADA = 'F' FETCH FIRST 10 ROWS ONLY", (err, data) => {
    console.log('=== CONTAS_PAGAR_REMESSA com VALDESCONTO > 0 e em aberto ===');
    console.log(data);

    // Check CONTAS_PAGAR_AGENDAMENTO structure for discounts
    conn.query("SELECT COLNAME, TYPENAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='CONTAS_PAGAR_AGENDAMENTO' ORDER BY COLNO", (err2, data2) => {
      console.log('=== CONTAS_PAGAR_AGENDAMENTO cols ===');
      console.log(data2.map(d => d.COLNAME));
      conn.closeSync();
    });
  });
});
