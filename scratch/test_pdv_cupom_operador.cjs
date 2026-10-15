const fs = require('fs');
const path = require('path');
const ibmdb = require('ibm_db');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.runtime', 'db-config.json'), 'utf8'));
const connStr = `DATABASE=${config.database};HOSTNAME=${config.hostname};PORT=${config.port};PROTOCOL=${config.protocol};UID=${config.uid};PWD=${config.pwd};ConnectTimeout=10;`;

console.log('Testando busca de operadores via DBA.PDV_CUPOM e DBA.PDV_CUPOM_ITEM...');

ibmdb.open(connStr, (err, conn) => {
  if (err) {
    console.error('Erro de conexao:', err);
    process.exit(1);
  }

  const sql = `
    SELECT 
      E.NOMEFANTASIA AS LOJA,
      COALESCE(U.NOMEUSUARIO, CAST(C.IDUSUARIO AS VARCHAR(20))) AS OPERADOR,
      SUM(I.QTDPRODUTO) AS QTD_VENDIDA,
      SUM(I.VALTOTITEM) AS TOTAL_VALOR,
      COUNT(DISTINCT C.NUMCUPOM) AS QTD_CUPONS
    FROM DBA.PDV_CUPOM C
    JOIN DBA.PDV_CUPOM_ITEM I ON I.IDEMPRESA = C.IDEMPRESA AND I.NUMCUPOM = C.NUMCUPOM AND I.SERIECUPOM = C.SERIECUPOM
    JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = C.IDEMPRESA
    LEFT JOIN DBA.VW_GEA_USUARIO U ON U.IDUSUARIO = C.IDUSUARIO
    WHERE I.IDSUBPRODUTO IN (22035, 13235)
      AND C.DTEMISSAO BETWEEN '2026-07-29' AND '2026-08-03'
    GROUP BY E.NOMEFANTASIA, U.NOMEUSUARIO, C.IDUSUARIO
    ORDER BY LOJA, QTD_VENDIDA DESC
    WITH UR
  `;

  conn.query(sql, (err2, rows) => {
    if (err2) {
      console.error('Erro query PDV_CUPOM:', err2.message);
    } else {
      console.log('\n--- VENDAS REAIS DOS OPERADORES (PDV_CUPOM + PDV_CUPOM_ITEM) ---');
      console.table(rows);
    }
    conn.close();
  });
});
