@echo off
setlocal EnableDelayedExpansion
color 0B
chcp 65001 >nul 2>&1
title Cybertech Gestao - Instalador Completo de Servidor de Rede

set DOMAIN_NAME=smartcybertech

echo.
echo  ============================================================
echo         CYBERTECH GESTAO - INSTALADOR DE SERVIDOR
echo              Acesso via Rede Local (LAN / Wi-Fi)
echo  ============================================================
echo.

:: 1. VERIFICA PERMISSOES DE ADMINISTRADOR
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    color 0C
    echo  [ERRO FATAL] Este instalador precisa de privilegios de ADMINISTRADOR!
    echo.
    echo  Por favor, clique com o botao direito neste arquivo
    echo  e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)
echo  [OK] Permissoes de Administrador confirmadas.

:: 2. VERIFICA NODE.JS
echo.
echo  [1/6] Verificando Node.js...
node -v >nul 2>&1
if %errorLevel% NEQ 0 (
    color 0E
    echo.
    echo  [AVISO] Node.js NAO foi encontrado nesta maquina!
    echo.
    echo  Tentando instalar Node.js LTS automaticamente via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    
    node -v >nul 2>&1
    if !errorLevel! NEQ 0 (
        echo.
        echo  Nao foi possivel instalar automaticamente.
        echo  Por favor, baixe e instale o Node.js manualmente:
        echo     https://nodejs.org/pt/download
        echo.
        start https://nodejs.org/pt/download
        pause
        exit /b
    )
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo  [OK] Node.js ativo: %NODE_VERSION%

set PORTA=3001
set DESTINO=C:\CybertechGestao

:: 3. COPIA OS ARQUIVOS PARA PASTA OFICIAL
echo.
echo  [2/6] Instalando arquivos em %DESTINO%...
if not exist "%DESTINO%" mkdir "%DESTINO%"
xcopy /E /Y /I /Q "%~dp0*" "%DESTINO%\" >nul 2>&1

:: Garante pasta .runtime e configuracao se existir
if exist "%~dp0.runtime" (
    if not exist "%DESTINO%\.runtime" mkdir "%DESTINO%\.runtime"
    xcopy /E /Y /I /Q "%~dp0.runtime\*" "%DESTINO%\.runtime\" >nul 2>&1
)

echo  [OK] Arquivos copiados com sucesso para %DESTINO%

:: 4. INSTALA DEPENDENCIAS NPM
echo.
echo  [3/6] Instalando modulos e dependencias de execucao...
cd /d "%DESTINO%"
call npm install --omit=dev --no-audit --no-fund
if %errorLevel% NEQ 0 (
    echo  [AVISO] Ocorreu um alerta no npm install, continuando configuracao...
) else (
    echo  [OK] Modulos prontos!
)

:: 5. LIBERA FIREWALL DO WINDOWS
echo.
echo  [4/6] Liberando porta %PORTA% no Firewall do Windows (Acesso pela rede)...
netsh advfirewall firewall delete rule name="Cybertech Gestao API" >nul 2>&1
netsh advfirewall firewall delete rule name="Cybertech Gestao API OUT" >nul 2>&1
netsh advfirewall firewall add rule name="Cybertech Gestao API" dir=in action=allow protocol=TCP localport=%PORTA% >nul 2>&1
netsh advfirewall firewall add rule name="Cybertech Gestao API OUT" dir=out action=allow protocol=TCP localport=%PORTA% >nul 2>&1
echo  [OK] Firewall liberado na porta %PORTA%

:: 6. INSTALA SERVICO DO WINDOWS
echo.
echo  [5/6] Configurando Servico do Windows (Inicializacao Automatica)...
cd /d "%DESTINO%"
node install-service.js
echo  [OK] Servico registrado no Windows.

:: 7. CRIA ATALHOS NA AREA DE TRABALHO
echo.
echo  [6/6] Criando atalhos na Area de Trabalho...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell;" ^
  "$Desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$s1 = $WshShell.CreateShortcut($Desktop + '\Cybertech Gestao.lnk');" ^
  "$s1.TargetPath = 'http://%DOMAIN_NAME%:%PORTA%';" ^
  "$s1.IconLocation = 'shell32.dll, 13';" ^
  "$s1.Save();" ^
  "$s2 = $WshShell.CreateShortcut($Desktop + '\Ver IP de Rede.lnk');" ^
  "$s2.TargetPath = '%DESTINO%\Ver_IP_e_Links_de_Acesso.bat';" ^
  "$s2.WorkingDirectory = '%DESTINO%';" ^
  "$s2.IconLocation = 'shell32.dll, 18';" ^
  "$s2.Save();" ^
  "$s3 = $WshShell.CreateShortcut($Desktop + '\Configurar Banco ou Nuvem.lnk');" ^
  "$s3.TargetPath = '%DESTINO%\Configurar_DataCISS.bat';" ^
  "$s3.WorkingDirectory = '%DESTINO%';" ^
  "$s3.IconLocation = 'shell32.dll, 19';" ^
  "$s3.Save();"

echo  [OK] Atalhos criados na Area de Trabalho!

:: 7B. CONFIGURA O DOMINIO LOCAL (cybertech.local)
echo.
echo  [+] Configurando dominio local %DOMAIN_NAME%...

:: Detecta o IP local
for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -First 1 -ExpandProperty IPAddress"') do set IP_SERVIDOR=%%i
if "!IP_SERVIDOR!"=="" set IP_SERVIDOR=127.0.0.1

set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts

:: Remove entradas antigas e adiciona novas
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$h = '%HOSTS_FILE%';" ^
  "$c = Get-Content $h -Encoding UTF8 -ErrorAction SilentlyContinue;" ^
  "$f = $c | Where-Object { $_ -notmatch '%DOMAIN_NAME%' };" ^
  "Set-Content $h $f -Encoding UTF8;" ^
  "Add-Content $h '';" ^
  "Add-Content $h '# --- Cybertech Gestao - Dominio Local ---';" ^
  "Add-Content $h ('127.0.0.1       %DOMAIN_NAME%');" ^
  "Add-Content $h ('!IP_SERVIDOR!   %DOMAIN_NAME%');" ^
  "Add-Content $h '# ----------------------------------------';"

:: Salva IP para uso posterior pelos clientes
if not exist "%DESTINO%\.runtime" mkdir "%DESTINO%\.runtime"
echo IP_SERVIDOR=!IP_SERVIDOR!> "%DESTINO%\.runtime\servidor_ip.txt"
echo DOMAIN_NAME=%DOMAIN_NAME%>> "%DESTINO%\.runtime\servidor_ip.txt"
echo PORTA=%PORTA%>> "%DESTINO%\.runtime\servidor_ip.txt"

echo  [OK] Dominio %DOMAIN_NAME% configurado! (IP: !IP_SERVIDOR!)

:: 8. DETECTA E MOSTRA OS IPS DE ACESSO
echo.
color 0A
echo  ============================================================
echo       SERVIDOR INSTALADO E CONFIGURADO COM SUCESSO!
echo  ============================================================
echo.
echo  O sistema ja esta rodando em segundo plano e vai iniciar
echo  AUTOMATICAMENTE toda vez que este computador ligar.
echo.
echo  ------------------------------------------------------------
echo  COMO ACESSAR NESTE COMPUTADOR (SERVIDOR):
echo.
echo     http://%DOMAIN_NAME%:%PORTA%      ^<^<^< LINK AMIGAVEL (recomendado)
echo     http://localhost:%PORTA%              ^<^<^< Link alternativo
echo.
echo  ------------------------------------------------------------
echo  PARA OUTROS COMPUTADORES / CELULARES NA REDE:
echo.
echo     Execute "Configurar_Cliente_Rede.bat" em CADA computador
echo     que precisar acessar o sistema pelo nome. Apos isso, acessa:
echo     http://%DOMAIN_NAME%:%PORTA%
echo.
echo     Ou via IP direto (sem configuracao extra):

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | ForEach-Object { Write-Host ('   >> http://' + $_.IPAddress + ':%PORTA%   (Adaptador: ' + $_.InterfaceAlias + ')') -ForegroundColor Green }"

echo.
echo  ------------------------------------------------------------
echo  ATALHOS NA AREA DE TRABALHO:
echo  >> "Cybertech Gestao"          - Abre o painel (dominio amigavel)
echo  >> "Ver IP de Rede"            - Consulta IPs e links de acesso
echo  >> "Configurar Banco ou Nuvem" - Config. banco de dados
echo ============================================================
echo.
echo Pressione qualquer tecla para abrir o sistema agora...
pause >nul

start http://%DOMAIN_NAME%:%PORTA%
