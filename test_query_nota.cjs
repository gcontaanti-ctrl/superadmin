const db = require('ibm_db');
const fs = require('fs');

const dbConfig = JSON.parse(fs.readFileSync('.runtime/db-config.json', 'utf8'));
const connStr = `DATABASE=${dbConfig.database};HOSTNAME=${dbConfig.hostname};PORT=${dbConfig.port};PROTOCOL=${dbConfig.protocol};UID=${dbConfig.uid};PWD=${dbConfig.pwd};`;

async function run() {
  let conn;
  try {
    conn = await db.open(connStr);
    
    const row = await conn.query(`
      SELECT 
        N.IDPLANILHA,
        N.NUMNOTA,
        N.DTMOVIMENTO        AS DATA_LANCAMENTO_SISTEMA,
        N.DTALTERACAO        AS DATA_ULTIMA_ALTERACAO,
        N.IDUSUARIO          AS ID_USUARIO_LANCAMENTO,
        U_LANC.NOMEUSUARIO   AS USUARIO_LANCAMENTO,
        N.IDUSUARIOALTERACAO AS ID_USUARIO_ALTERACAO,
        U_ALT.NOMEUSUARIO    AS USUARIO_ALTERACAO,
        N.IDAUTORIZADO       AS ID_AUTORIZADO,
        U_AUT.NOMEUSUARIO    AS USUARIO_AUTORIZADO,
        NES.DTMOVIMENTO      AS DATA_MOV_NES,
        NES.DTEMISSAO        AS DATA_EMISSAO_FORNECEDOR,
        NES.HREMISSAO        AS HORA_EMISSAO_NES,
        NES.IDAUTORIZADO     AS ID_AUTORIZADO_NES,
        U_AUT2.NOMEUSUARIO   AS USUARIO_AUTORIZADO_NES
      FROM DBA.NOTAS N
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NES ON NES.IDPLANILHA = N.IDPLANILHA
      LEFT JOIN DBA.VW_GEA_USUARIO U_LANC ON U_LANC.IDUSUARIO = N.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_USUARIO U_ALT  ON U_ALT.IDUSUARIO  = N.IDUSUARIOALTERACAO
      LEFT JOIN DBA.VW_GEA_USUARIO U_AUT  ON U_AUT.IDUSUARIO  = N.IDAUTORIZADO
      LEFT JOIN DBA.VW_GEA_USUARIO U_AUT2 ON U_AUT2.IDUSUARIO = NES.IDAUTORIZADO
      WHERE N.IDPLANILHA = 10441877 WITH UR
    `);
    console.log("All date+user fields for invoice:", row[0]);

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

run();
