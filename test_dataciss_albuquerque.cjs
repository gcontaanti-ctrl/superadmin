const net = require('net');
const dns = require('dns');

const host = 'albuquerque.dataciss.com.br';
const ports = [30231, 50000, 50001, 443, 80];

console.log(`\n=== TESTE DE CONECTIVIDADE: ${host} ===\n`);

dns.lookup(host, (err, address) => {
  if (err) {
    console.error(`[DNS] Falha ao resolver DNS para ${host}:`, err.message);
    return;
  }
  console.log(`[DNS] Endereço IP resolvido: ${address}\n`);

  ports.forEach((port) => {
    const socket = new net.Socket();
    socket.setTimeout(4000);

    socket.on('connect', () => {
      console.log(`[SUCESSO] Porta ${port} ESTÁ ABERTA e RESPONDENDO!`);
      socket.destroy();
    });

    socket.on('timeout', () => {
      console.log(`[TIMEOUT] Porta ${port} não respondeu (possivelmente bloqueada por firewall/VPN).`);
      socket.destroy();
    });

    socket.on('error', (e) => {
      console.log(`[FECHADA/RECUSADA] Porta ${port} falhou: ${e.code || e.message}`);
    });

    socket.connect(port, host);
  });
});
