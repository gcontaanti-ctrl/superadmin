import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Service = require('node-windows').Service;
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cria um novo objeto de serviço
const svc = new Service({
  name: 'Cybertech Gestao API',
  description: 'Servidor Backend e Frontend do Sistema Cybertech Gestão (ERP)',
  script: path.join(__dirname, 'backend_api.cjs'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Escuta o evento de instalação concluída
svc.on('install', function() {
  console.log('Serviço instalado com sucesso!');
  console.log('Iniciando o serviço...');
  svc.start();
});

// Escuta o evento de desinstalação
svc.on('uninstall', function() {
  console.log('Serviço desinstalado.');
  console.log('Instalando novamente para garantir a versão mais recente...');
  svc.install();
});

// Escuta erros
svc.on('error', function(err) {
  console.error('Erro no serviço:', err);
});

// Se o serviço já existe, desinstala primeiro para atualizar
if (svc.exists) {
  console.log('O serviço já existe. Desinstalando versão antiga...');
  svc.uninstall();
} else {
  console.log('Instalando serviço novo...');
  svc.install();
}
