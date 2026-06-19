const { spawn } = require('child_process');
const path = require('path');

// 1. Iniciar API Backend
const apiProcess = spawn('node', ['backend_api.cjs'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// 2. Iniciar Frontend (Vite) na rede local
const viteProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

console.log('----------------------------------------------------');
console.log(' Servidor Super Admin Iniciado!');
console.log(' O painel está acessível na rede local na porta 8080');
console.log(' A API está rodando na porta 3001');
console.log('----------------------------------------------------');

process.on('SIGINT', () => {
  apiProcess.kill();
  viteProcess.kill();
  process.exit();
});
