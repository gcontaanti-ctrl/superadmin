import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Service = require('node-windows').Service;
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svc = new Service({
  name: 'Cybertech Gestao API',
  description: 'Servidor Backend e Frontend do Sistema Cybertech Gestão (ERP)',
  script: path.join(__dirname, 'backend_api.cjs')
});

svc.on('uninstall', function() {
  console.log('----------------------------------------------------');
  console.log('Serviço "Cybertech Gestao API" desinstalado com sucesso!');
  console.log('O servidor não será mais iniciado com o Windows.');
  console.log('----------------------------------------------------');
});

svc.on('error', function(err) {
  console.error('Erro ao desinstalar serviço:', err);
});

if (svc.exists) {
  console.log('Desinstalando serviço do Windows...');
  svc.uninstall();
} else {
  console.log('O serviço "Cybertech Gestao API" não está instalado nesta máquina.');
}
