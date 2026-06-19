const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'SuperAdmin Server',
  description: 'Servidor local do sistema Super Admin',
  script: path.join(__dirname, 'server_launcher.cjs'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install', function() {
  svc.start();
  console.log('----------------------------------------------------');
  console.log('Serviço instalado e iniciado com sucesso como "SuperAdmin Server"!');
  console.log('O servidor será reiniciado automaticamente se o Windows reiniciar.');
  console.log('----------------------------------------------------');
});

// Desinstala um antigo caso exista antes de instalar
svc.on('uninstall', function() {
  console.log('Serviço anterior desinstalado. Instalando o novo...');
  svc.install();
});

if (svc.exists) {
  svc.uninstall();
} else {
  svc.install();
}
