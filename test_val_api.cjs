const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=30;";

function queryDB(sql, params = []) {
    return new Promise((resolve, reject) => {
        ibmdb.open(connStr, function(err, conn) {
            if (err) return reject(err);
            conn.query(sql, params, function(err, data) {
                conn.closeSync();
                if (err) return reject(err);
                resolve(data);
            });
        });
    });
}

async function run() {
    try {
        let q = `
      SELECT 
          E.NOMEFANTASIA AS LOJA,
          P.DESCRICAO AS PRODUTO,
          N.NUMNOTA AS NOTA_FISCAL,
          U_ENT.NOMEUSUARIO AS USUARIO_ENTRADA,
          U_LIB.NOMEUSUARIO AS USUARIO_LIBEROU,
          N.DTMOVIMENTO AS DATA_ENTRADA,
          '' AS HORA_ENTRADA,
          NV.QTDPRODUTO AS QTD_RECEBIDA,
          NV.DTVALIDADE AS DATA_VALIDADE,
          DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) AS DIAS_RESTANTES
      FROM DBA.NOTAS_VALIDADE NV
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = NV.IDSUBPRODUTO
      JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = NV.IDEMPRESA
      JOIN DBA.NOTAS N ON N.IDPLANILHA = NV.IDPLANILHA
      LEFT JOIN DBA.VW_GEA_USUARIO U_ENT ON U_ENT.IDUSUARIO = N.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_USUARIO U_LIB ON U_LIB.IDUSUARIO = N.IDUSUARIOALTERACAO
      WHERE NV.DTVALIDADE >= CURRENT DATE
        AND NV.STATUS = 'C'
    `;
    let params = [];
    const maxDias = 20;
    q += ` AND DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) <= ?`;
    params.push(maxDias);

    q += `
      ORDER BY NV.DTVALIDADE ASC
      FETCH FIRST 200 ROWS ONLY
      WITH UR
    `;
    const data = await queryDB(q, params);
    console.log("Success! Data length:", data.length);
    } catch(err) {
        console.error("API ERROR:", err);
    }
}
run();
