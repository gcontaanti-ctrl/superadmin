@echo off
cd /d "%~dp0"
:: Mata processos antigos na porta 3001 e 8080 para evitar conflitos
for /f "tokens=5" %%a in ('netstat -aon ^| find "3001" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find "8080" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find "8081" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find "8082" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo Iniciando Backend (Porta 3001)...
start "HORUS Backend (Porta 3001)" /min node backend_api.cjs
echo Iniciando Tunel de Acesso Externo (Cloudflare)...
start "HORUS Tunel Cloudflare" /min node start_public_tunnel.cjs
echo Iniciando Frontend Local (Porta 8080)...
start "HORUS Frontend (Porta 8080)" /min npm run dev

echo Aguardando servidores...
ping 127.0.0.1 -n 6 >nul

:: Tenta abrir no Edge em modo app, se nao abre padrao
start msedge --app=http://localhost:8080 || start http://localhost:8080