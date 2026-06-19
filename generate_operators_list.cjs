const ibmdb = require('ibm_db');
const connStr = "DATABASE=cisserp;HOSTNAME=192.168.20.20;PORT=30231;PROTOCOL=TCPIP;UID=contabilidade;PWD=}yFhZ1PuJB*[]!s;;ConnectTimeout=10;";

function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    ibmdb.open(connStr, (err, conn) => {
      if (err) return reject(err);
      conn.query(sql, params, (err, data) => {
        conn.close(() => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    });
  });
}

async function run() {
  try {
    const q = `
      SELECT 
        U.IDUSUARIO AS ID,
        U.NOMEUSUARIO AS NOME,
        E.NOMEFANTASIA AS LOJA
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      JOIN DBA.NOTAS N ON N.IDEMPRESA = V.IDEMPRESA AND N.NUMNOTA = V.NUMNOTA AND N.SERIENOTA = V.SERIENOTA
      JOIN DBA.VW_GEA_USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = V.IDEMPRESA
      WHERE V.DTMOVIMENTO >= CURRENT DATE - 30 DAYS
      AND (U.GRUPO LIKE 'OPERADOR LJ %' OR U.GRUPO = 'CAIXA')
      AND U.NOMEUSUARIO NOT LIKE '%TREINAMENTO%'
      GROUP BY U.IDUSUARIO, U.NOMEUSUARIO, E.NOMEFANTASIA
      ORDER BY E.NOMEFANTASIA, U.NOMEUSUARIO
      WITH UR
    `;
    const data = await queryDB(q);
    
    const fs = require('fs');
    const path = require('path');
    
    let md = "# Lista de Operadores por Loja\n\nOperadores com vendas nos últimos 30 dias:\n\n";
    let currentStore = "";
    
    data.forEach(row => {
      const loja = row.LOJA || "Sem Loja";
      if (loja !== currentStore) {
        md += `\n### ${loja}\n`;
        currentStore = loja;
      }
      md += `- [${row.ID}] ${row.NOME}\n`;
    });
    
    fs.writeFileSync("operadores_por_loja.md", md, "utf8");
    console.log("File written.");

  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
