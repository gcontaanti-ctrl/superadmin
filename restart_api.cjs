const { execSync, spawn } = require('child_process');

try {
  const netstat = execSync('netstat -ano | findstr :3001', { encoding: 'utf8' });
  const lines = netstat.split('\n');
  for (const line of lines) {
    if (line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Processo antigo ${pid} finalizado.`);
        } catch (_) {}
      }
    }
  }
} catch (e) {
  console.log("Nenhum processo anterior na porta 3001.");
}

const child = spawn('node', ['backend_api.cjs'], {
  detached: true,
  stdio: 'ignore'
});
child.unref();
console.log("Novo backend iniciado com PID:", child.pid);
