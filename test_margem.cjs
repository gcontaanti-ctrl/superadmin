const ibmdb = require('ibm_db');
const fs = require('fs');
const path = require('path');

function loadLocalEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const val = trimmed.slice(sep + 1).trim().replace(/^[\"']|[\"']$/g, '');
    if (key && process.env[key] == null) process.env[key] = val;
  }
}
loadLocalEnvFile();

let cfg = {};
try {
  const cfgPath = path.join(__dirname, '.runtime', 'db-config.json');
  if (fs.existsSync(cfgPath)) cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
} catch(_) {}

const connStr = `DATABASE=${cfg.database||'cisserp'};HOSTNAME=${cfg.hostname||'192.168.20.20'};PORT=${cfg.port||'30231'};PROTOCOL=TCPIP;UID=${cfg.uid||'contabilidade'};PWD=${cfg.pwd||''};ConnectTimeout=30;`;

ibmdb.open(connStr, async (err, conn) => {
  if (err) { console.error('ERRO:', err.message); process.exit(1); }
  console.log('Conectado!\n');

  // Ver colunas de ESTOQUE_ANA_HIST_LUCRO_VW (pai da NOTAS_LUCRO_VIEW)
  console.log('=== COLUNAS DE ESTOQUE_ANA_HIST_LUCRO_VW ===');
  await new Promise(res => {
    conn.query(`SELECT COLNAME, TYPENAME FROM SYSCAT.COLUMNS WHERE TABSCHEMA='DBA' AND TABNAME='ESTOQUE_ANA_HIST_LUCRO_VW' ORDER BY COLNO`, (e, cols) => {
      if (e) console.log('Erro:', e.message);
      else cols.forEach(c => console.log(` - ${c.COLNAME} (${c.TYPENAME})`));
      res();
    });
  });

  // Tentar ler ESTOQUE_ANA_HIST_LUCRO_VW
  console.log('\n=== AMOSTRA ESTOQUE_ANA_HIST_LUCRO_VW (3 linhas) ===');
  await new Promise(res => {
    conn.query(`SELECT * FROM DBA.ESTOQUE_ANA_HIST_LUCRO_VW FETCH FIRST 3 ROWS ONLY WITH UR`, (e, rows) => {
      if (e) console.log('Erro:', e.message);
      else rows.forEach(r => console.log(JSON.stringify(r)));
      res();
    });
  });

  // Tentar ESTOQUE_ANA_HIST_LUCRO_VW agrupado por empresa num mês
  console.log('\n=== LUCRO POR EMPRESA MAIO 2026 (ESTOQUE_ANA_HIST_LUCRO_VW) ===');
  await new Promise(res => {
    conn.query(`
      SELECT IDEMPRESA,
        SUM(VALTOTLIQUIDO) AS FATURAMENTO,
        SUM(LUCRO) AS LUCRO_TOTAL,
        CASE WHEN SUM(VALTOTLIQUIDO) > 0
          THEN DECIMAL(SUM(LUCRO)/SUM(VALTOTLIQUIDO)*100, 8, 2)
          ELSE 0 END AS MARGEM_PCT
      FROM DBA.ESTOQUE_ANA_HIST_LUCRO_VW
      WHERE DTMOVIMENTO BETWEEN '2026-05-01' AND '2026-05-31'
      GROUP BY IDEMPRESA
      ORDER BY FATURAMENTO DESC
      FETCH FIRST 10 ROWS ONLY WITH UR
    `, (e, rows) => {
      if (e) console.log('Erro:', e.message);
      else rows.forEach(r => console.log(JSON.stringify(r)));
      res();
    });
  });

  conn.closeSync();
  console.log('\nFinalizado!');
});
