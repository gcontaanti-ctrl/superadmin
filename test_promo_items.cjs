const ibmdb = require('ibm_db');
const connStr = 'DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;';
ibmdb.open(connStr, (err, conn) => {
  if (err) { console.error(err); return; }
  let sql = `
    SELECT 
      EA.IDSUBPRODUTO,
      SUM(EA.VALTOTLIQUIDO) AS RECEITA,
      SUM(EA.QTDPRODUTO) AS QTD
    FROM DBA.PROMOCAO_GESTAO P
    JOIN DBA.ESTOQUE_ANALITICO_PROMOCAO_GESTAO EAPG ON P.IDPROMOCAO = EAPG.IDPROMOCAO
    JOIN DBA.ESTOQUE_ANALITICO EA ON EAPG.IDPLANILHA = EA.IDPLANILHA AND EAPG.NUMSEQUENCIA = EA.NUMSEQUENCIA
    WHERE P.DTINIPROMOCAO >= '2026-05-01'
    GROUP BY EA.IDSUBPRODUTO
    FETCH FIRST 10 ROWS ONLY
    WITH UR
  `;
  conn.query(sql, (err, data) => {
    if (err) { console.error(err); } else { console.log(data); }
    conn.close();
  });
});
