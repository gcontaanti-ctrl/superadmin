const ibmdb = require('ibm_db');
const path = require('path');
const fs = require('fs');

const cfgLocal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.runtime', 'db-config.json'), 'utf8'));
const cs = `DATABASE=${cfgLocal.database};HOSTNAME=${cfgLocal.hostname};PORT=${cfgLocal.port};PROTOCOL=TCPIP;UID=${cfgLocal.uid};PWD=${cfgLocal.pwd};ConnectTimeout=30;`;

ibmdb.open(cs, async (err, conn) => {
  if (err) return console.error(err);
  
  const query = (sql, params = []) => new Promise((resolve, reject) => {
    conn.query(sql, params, (e, res) => e ? reject(e) : resolve(res));
  });

  try {
    const res = await query(`
      SELECT 
        E.IDEMPRESA,
        EMP.NOMEFANTASIA AS LOJA,
        P.IDSUBPRODUTO,
        P.DESCRICAO,
        COALESCE(P.MARCAFABRICANTE, 'GERAL') AS MARCA,
        E.QTDATUALESTOQUE,
        E.VALCUSTOMEDIO,
        E.VALVENDA,
        E.DTULTIMAVENDA
      FROM DBA.ESTOQUE_SALDO_ATUAL E
      JOIN DBA.VW_GEA_EMPRESA EMP ON EMP.IDEMPRESA = E.IDEMPRESA
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = E.IDSUBPRODUTO
      WHERE E.QTDATUALESTOQUE <= 5
        AND P.FLAGINATIVOCOMPRA = 'F'
      FETCH FIRST 10 ROWS ONLY
      WITH UR
    `);

    console.log("SUCCESS! Sample real products in stock risk:", res);

  } catch(e) {
    console.error("QUERY ERR:", e.message);
  } finally {
    conn.closeSync();
  }
});
