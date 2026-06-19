const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }

  // Check CONTAS_PAGAR_REMESSA for discount entries
  conn.query("SELECT COLNAME, TYPENAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='CONTAS_PAGAR_REMESSA' ORDER BY COLNO", (err, data) => {
    console.log('=== CONTAS_PAGAR_REMESSA cols ===');
    console.log(data.map(d => d.COLNAME));

    // Check FORMA_PAGREC_DESCONTOVENC structure
    conn.query("SELECT COLNAME, TYPENAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='FORMA_PAGREC_DESCONTOVENC' ORDER BY COLNO", (err2, data2) => {
      console.log('=== FORMA_PAGREC_DESCONTOVENC cols ===');
      console.log(data2.map(d => d.COLNAME));

      // Check FORMA_PAGREC_PERIODO_DESCONTO structure
      conn.query("SELECT COLNAME, TYPENAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='FORMA_PAGREC_PERIODO_DESCONTO' ORDER BY COLNO", (err3, data3) => {
        console.log('=== FORMA_PAGREC_PERIODO_DESCONTO cols ===');
        console.log(data3.map(d => d.COLNAME));

        // Sample data from FORMA_PAGREC_DESCONTOVENC
        conn.query("SELECT * FROM DBA.FORMA_PAGREC_DESCONTOVENC FETCH FIRST 5 ROWS ONLY", (err4, data4) => {
          console.log('=== FORMA_PAGREC_DESCONTOVENC sample ===');
          console.log(data4);

          conn.closeSync();
        });
      });
    });
  });
});
