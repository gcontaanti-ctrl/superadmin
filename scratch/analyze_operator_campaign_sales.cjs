const fs = require('fs');
const path = require('path');
const ibmdb = require('ibm_db');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.runtime', 'db-config.json'), 'utf8'));
const connStr = `DATABASE=${config.database};HOSTNAME=${config.hostname};PORT=${config.port};PROTOCOL=${config.protocol};UID=${config.uid};PWD=${config.pwd};ConnectTimeout=10;`;

console.log('Analisando vendas de operadores por loja no DB2 especificamente para os produtos da campanha ativa (Café Santa Clara 13235 + Caixa Bombom Garoto 22035) entre 2026-07-29 e 2026-08-03...');

ibmdb.open(connStr, (err, conn) => {
  if (err) {
    console.error('Erro de conexao:', err);
    process.exit(1);
  }

  // 1. Vendas filtradas estritamente pelos produtos da campanha no periodo da campanha
  const sqlCampaignOnly = `
    SELECT 
      E.NOMEFANTASIA AS LOJA,
      COALESCE(TRIM(U.NOMEUSUARIO), CAST(V.IDUSUARIO AS VARCHAR(20))) AS OPERADOR,
      SUM(V.QTDPRODUTO) AS QTD_CAMPANHA,
      SUM(V.VALTOTLIQUIDO) AS VALOR_CAMPANHA,
      COUNT(DISTINCT V.NUMNOTA) AS CUPONS_CAMPANHA
    FROM DBA.VW_GEA_VENDAS_DIARIAS V
    JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = V.IDEMPRESA
    LEFT JOIN DBA.VW_GEA_USUARIO U ON U.IDUSUARIO = V.IDUSUARIO
    WHERE V.IDSUBPRODUTO IN (22035, 13235)
      AND V.DTMOVIMENTO BETWEEN '2026-07-29' AND '2026-08-03'
    GROUP BY E.NOMEFANTASIA, U.NOMEUSUARIO, V.IDUSUARIO
    ORDER BY LOJA, QTD_CAMPANHA DESC
    WITH UR
  `;

  conn.query(sqlCampaignOnly, (err2, rows) => {
    if (err2) {
      console.error('Erro query:', err2);
    } else {
      console.log('\n--- VENDAS POR OPERADOR (APENAS PRODUTOS DA CAMPANHA NO PERIODO) ---');
      console.table(rows.slice(0, 30));
    }
    conn.close();
  });
});
