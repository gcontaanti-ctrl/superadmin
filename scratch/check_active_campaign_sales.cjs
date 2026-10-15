const fs = require('fs');
const path = require('path');
const ibmdb = require('ibm_db');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.runtime', 'db-config.json'), 'utf8'));
const connStr = `DATABASE=${config.database};HOSTNAME=${config.hostname};PORT=${config.port};PROTOCOL=${config.protocol};UID=${config.uid};PWD=${config.pwd};ConnectTimeout=10;`;

console.log('Buscando vendas reais para os produtos da campanha ativa em DB2...');

ibmdb.open(connStr, (err, conn) => {
  if (err) {
    console.error('Erro de conexao:', err);
    process.exit(1);
  }

  const sql = `
    SELECT 
      V.IDSUBPRODUTO,
      MAX(P.DESCRICAO) AS NOME_PRODUTO,
      SUM(V.QTDPRODUTO) AS TOTAL_QTD,
      SUM(V.VALTOTLIQUIDO) AS TOTAL_VALOR,
      COUNT(DISTINCT V.NUMNOTA) AS TOTAL_CUPONS
    FROM DBA.VW_GEA_VENDAS_DIARIAS V
    JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO
    WHERE V.IDSUBPRODUTO IN (22035, 13235)
      AND V.DTMOVIMENTO BETWEEN '2026-07-29' AND '2026-08-03'
    GROUP BY V.IDSUBPRODUTO
    WITH UR
  `;

  conn.query(sql, (err2, rows) => {
    if (err2) {
      console.error('Erro query:', err2);
    } else {
      console.log('Vendas reais encontradas no DB2:');
      console.table(rows);
    }
    conn.close();
  });
});
