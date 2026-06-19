const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  conn.query("SELECT * FROM DBA.VW_GEA_VENDAS_DIARIAS FETCH FIRST 1 ROWS ONLY WITH UR", (err, data) => {
    if (err) { console.error(err); } else { console.log("VW_GEA_VENDAS_DIARIAS:", Object.keys(data[0])); }
    
    conn.query("SELECT * FROM DBA.PDV_CUPOM_ITEM FETCH FIRST 1 ROWS ONLY WITH UR", (err2, data2) => {
      if (!err2 && data2.length) console.log("PDV_CUPOM_ITEM:", Object.keys(data2[0]));
      
      conn.query("SELECT * FROM DBA.PDV_CUPOM FETCH FIRST 1 ROWS ONLY WITH UR", (err3, data3) => {
         if (!err3 && data3.length) console.log("PDV_CUPOM:", Object.keys(data3[0]));
         conn.close();
      });
    });
  });
});
