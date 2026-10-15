@echo off
color 0B
echo ========================================================
echo         Instalador - Cybertech Gestao (ERP Local)
echo ========================================================
echo.

:: Verifica Permissoes de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Permissoes de Administrador confirmadas.
) else (
    color 0C
    echo [ERRO FATAL] Voce precisa de privilegios de Administrador!
    echo Clique com o botao direito neste arquivo (Instalar.bat)
    echo e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)

:: Verifica Node.js
node -v >nul 2>&1
if %errorLevel% NEQ 0 (
    color 0E
    echo [AVISO] Node.js nao encontrado nesta maquina!
    echo Por favor, instale o Node.js LTS (v20+) antes de continuar.
    echo Baixe em: https://nodejs.org
    echo.
    pause
    exit /b
)

echo.
echo [1/4] Copiando arquivos para o Diretorio C:\CybertechGestao...
if not exist "C:\CybertechGestao" mkdir "C:\CybertechGestao"

:: Usamos o xcopy para copiar os arquivos do instalador para a pasta oficial
xcopy /E /Y /I /Q "%~dp0*" "C:\CybertechGestao\"

echo.
echo [2/4] Preparando dependencias e pacotes...
cd /d "C:\CybertechGestao"
call npm install --no-audit --no-fund

echo.
echo [3/5] Liberando porta 3001 no Firewall (Acesso via Wi-Fi)...
netsh advfirewall firewall add rule name="Cybertech Gestao (Porta 3001)" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1

echo.
echo [4/5] Instalando e Iniciando o Servico do Windows...
node install-service.js

echo.
echo [5/5] Criando atalho na Area de Trabalho...
set SCRIPT="%TEMP%\CybertechShortcut-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%USERPROFILE%\Desktop\Cybertech Gestao.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
:: O atalho vai abrir a URL local
echo oLink.TargetPath = "http://localhost:3001" >> %SCRIPT%
:: Um ícone genérico do sistema
echo oLink.IconLocation = "shell32.dll, 13" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
color 0A
echo ========================================================
echo     SISTEMA INSTALADO E RODANDO COM SUCESSO!
echo ========================================================
echo - O Banco de dados (DB2) e a API ja estao ativos em segundo plano.
echo - O sistema vai iniciar sozinho toda vez que o Windows ligar.
echo - A pasta principal do sistema eh: C:\CybertechGestao
echo.
echo Pressione qualquer tecla para abrir o sistema agora...
pause >nul

:: Abre o navegador padrão na URL do sistema
start http://localhost:3001
