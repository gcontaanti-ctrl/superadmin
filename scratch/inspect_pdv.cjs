const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';

ibmdb.open(connStr, (err, conn) => {
  if (err) {
    console.error("Connection Error:", err);
    return;
  }
  
  const sql = `
    SELECT IDEMPRESA, NOMEFANTASIA 
    FROM DBA.VW_GEA_EMPRESA 
    ORDER BY IDEMPRESA
    WITH UR
  `;
  
  conn.query(sql, (err, rows) => {
    if (err) {
      console.error("Error executing query:", err);
    } else {
      console.log("=== COMPANIES ===");
      console.log(rows);
    }
    conn.close();
  });
});
