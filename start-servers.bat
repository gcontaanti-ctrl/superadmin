@echo off
cd /d "%~dp0"
:: Mata processos antigos na porta 3001 e 8080 para evitar conflitos
for /f "tokens=5" %%a in ('netstat -aon ^| find "3001" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find "8080" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo Iniciando Backend...
start /b node backend_api.cjs
echo Iniciando Frontend...
start /b npm run dev

echo Aguardando servidores...
timeout /t 5 /nobreak >nul

:: Tenta abrir no Edge em modo app, se nao abre padrao
start msedge --app=http://localhost:8080 || start http://localhost:8080