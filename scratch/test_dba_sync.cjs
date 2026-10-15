const fs = require('fs');
const path = require('path');
const ibmdb = require('ibm_db');

const configPath = path.join(__dirname, '..', '.runtime', 'db-config.json');
if (!fs.existsSync(configPath)) {
  console.error('Arquivo de configuracao db-config.json nao encontrado em:', configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const host = config.useExternalHost && config.externalHost ? config.externalHost : config.hostname;
const port = config.useExternalHost && config.externalPort ? config.externalPort : config.port;

const connStr = `DATABASE=${config.database};HOSTNAME=${host};PORT=${port};PROTOCOL=${config.protocol || 'TCPIP'};UID=${config.uid};PWD=${config.pwd};ConnectTimeout=${config.connectTimeout || '10'};`;

console.log(`Conectando ao banco DB2 (DBA)... Host: ${host}:${port}, DB: ${config.database}, User: ${config.uid}`);

ibmdb.open(connStr, (err, conn) => {
  if (err) {
    console.error('[ERRO CONEXAO DBA]:', err.message);
    process.exit(1);
  }
  console.log('[OK] Conexao com banco DB2 estabelecida com sucesso!');

  conn.query("SELECT COUNT(*) AS TOTAL_EMPRESAS FROM DBA.VW_GEA_EMPRESA WITH UR", (err1, res1) => {
    if (err1) {
      console.error('[ERRO QUERY DBA.VW_GEA_EMPRESA]:', err1.message);
    } else {
      console.log('[RESULTADO DBA] Total Empresas:', res1[0]?.TOTAL_EMPRESAS);
    }

    conn.query("SELECT MAX(DTMOVIMENTO) AS ULTIMA_VENDA FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR", (err2, res2) => {
      if (err2) {
        console.error('[ERRO QUERY DBA.VW_GEA_VENDAS_DIARIAS]:', err2.message);
      } else {
        console.log('[RESULTADO DBA] Ultima movimentacao de vendas (DBA):', res2[0]?.ULTIMA_VENDA);
      }
      conn.close();
      console.log('[FINALIZADO] Sincronizacao/Teste com DBA executado com sucesso.');
    });
  });
});
