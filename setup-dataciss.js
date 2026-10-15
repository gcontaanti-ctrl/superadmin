const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ibmdb = require('ibm_db');

const CONFIG_PATH = path.join(__dirname, '.runtime', 'db-config.json');
const ENV_PATH = path.join(__dirname, 'cliente-config.env');

// Ler configuracao atual
let currentConfig = {
  database: 'cisserp',
  hostname: '192.168.20.20',
  port: '30231',
  protocol: 'TCPIP',
  uid: 'contabilidade',
  pwd: '',
  connectTimeout: '10'
};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    currentConfig = { ...currentConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (e) {}
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('============================================================');
console.log('    CONFIGURADOR FÁCIL - OPÇÃO 1: NUVEM DATACISS (VPN)');
console.log('============================================================');
console.log('Com a VPN ativa, o DataCISS responde como um IP interno.');
console.log('IP atual configurado:', currentConfig.hostname);
console.log('------------------------------------------------------------\n');

rl.question('Digite o novo IP do servidor DataCISS (ex: 10.0.0.20 ou IP da CISS): ', (newIp) => {
  const ip = newIp.trim() || currentConfig.hostname;

  rl.question(`Porta do DB2 [Pressione ENTER para manter ${currentConfig.port}]: `, (newPort) => {
    const port = newPort.trim() || currentConfig.port;

    rl.question(`Usuário do DB2 [Pressione ENTER para manter "${currentConfig.uid}"]: `, (newUser) => {
      const user = newUser.trim() || currentConfig.uid;

      rl.question('Senha do DB2 [Pressione ENTER para manter a senha atual]: ', (newPwd) => {
        const pwd = newPwd.trim() ? newPwd.trim() : currentConfig.pwd;

        const updated = {
          ...currentConfig,
          hostname: ip,
          port: port,
          uid: user,
          pwd: pwd,
          updatedAt: new Date().toISOString()
        };

        // 1. Salvar no .runtime/db-config.json
        const runtimeDir = path.join(__dirname, '.runtime');
        if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');

        // 2. Salvar no cliente-config.env
        const envContent = [
          '# =============== CONFIGURACOES DO CLIENTE ===============',
          `DB2_HOSTNAME=${ip}`,
          `DB2_UID=${user}`,
          `DB2_PWD=${pwd}`,
          'SUPABASE_CONFIG_ID=default',
          '# =============== NAO ALTERAR (PADROES) ===============',
          `DB2_DATABASE=${updated.database}`,
          `DB2_PORT=${port}`,
          'DB2_PROTOCOL=TCPIP',
          'PORT=3001'
        ].join('\r\n');
        fs.writeFileSync(ENV_PATH, envContent, 'utf8');

        console.log('\n------------------------------------------------------------');
        console.log('[OK] Configuração salva com sucesso!');
        console.log(`Conectando em: ${ip}:${port} (Banco: ${updated.database}, Usuário: ${user})`);
        console.log('Testando conexão com o DataCISS agora...');
        console.log('------------------------------------------------------------');

        const connStr = `DATABASE=${updated.database};HOSTNAME=${ip};PORT=${port};PROTOCOL=TCPIP;UID=${user};PWD=${pwd};ConnectTimeout=8;`;

        ibmdb.open(connStr, (err, conn) => {
          if (err) {
            console.log('\n[AVISO DE CONEXÃO]');
            console.log('A configuração foi salva, mas o banco ainda não respondeu:');
            console.log('Detalhe:', err.message);
            console.log('\nVerifique:');
            console.log('1. Se o túnel VPN com a CISS está conectado;');
            console.log(`2. Se você consegue dar ping no IP ${ip};`);
            console.log(`3. Se a porta ${port} está liberada no DataCISS.`);
          } else {
            conn.query('SELECT CURRENT DATE AS HOJE FROM SYSIBM.SYSDUMMY1 WITH UR', (qErr, rows) => {
              try { conn.close(); } catch(e) {}
              if (qErr) {
                console.log('\n[CONECTADO COM SUCESSO AO DATACISS]');
              } else {
                console.log('\n============================================================');
                console.log('  SUCESSO TOTAL! CONEXÃO COM O DATACISS ESTÁ ATIVA!');
                console.log('  Data do Servidor DB2 na Nuvem:', rows?.[0]?.HOJE);
                console.log('============================================================');
              }
            });
          }
          rl.close();
        });
      });
    });
  });
});
