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
    const prodCols = await query("SELECT COLNAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='VW_GEA_PRODUTO' WITH UR").catch(() => []);
    console.log("VW_GEA_PRODUTO Cols:", prodCols.map(c => c.COLNAME));

    const sampleFull = await query(`
      SELECT P.IDSUBPRODUTO, P.DESCRICAO, P.CATEGORIA, P.MARCA, P.FORNECEDOR, P.CODIGOBARRAS
      FROM DBA.VW_GEA_PRODUTO P
      FETCH FIRST 5 ROWS ONLY WITH UR
    `).catch(async (e) => {
       console.log("Error querying VW_GEA_PRODUTO directly:", e.message);
       return await query(`SELECT * FROM DBA.VW_GEA_PRODUTO FETCH FIRST 1 ROWS ONLY WITH UR`).catch(err => err.message);
    });
    console.log("Sample VW_GEA_PRODUTO:", sampleFull);

  } catch(e) {
    console.error(e);
  } finally {
    conn.closeSync();
  }
});
