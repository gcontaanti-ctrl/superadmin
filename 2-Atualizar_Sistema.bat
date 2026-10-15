@echo off
setlocal EnableDelayedExpansion
color 0B
chcp 65001 >nul 2>&1
title Atualizador - SmartCybertech Gestao

echo ========================================================
echo        ATUALIZADOR - SMARTCYBERTECH GESTAO (ERP)
echo ========================================================
echo.

:: 1. Verifica Permissoes de Administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    color 0C
    echo [ERRO FATAL] Voce precisa de privilegios de Administrador!
    echo Clique com o botao direito neste arquivo (2-Atualizar_Sistema.bat)
    echo e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)
echo [OK] Permissoes de Administrador confirmadas.
echo.

:: 2. Para os servicos e processos antigos para destravar os arquivos
echo [1/4] Parando servicos antigos e liberando arquivos bloqueados...
net stop "cybertechgestaoapi.exe" /y >nul 2>&1
net stop "Cybertech Gestao API" /y >nul 2>&1
sc stop "cybertechgestaoapi" >nul 2>&1
taskkill /f /im cybertechgestaoapi.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
ping 127.0.0.1 -n 4 >nul
echo [OK] Servicos parados e arquivos liberados.
echo.

:: 3. Copia os novos arquivos para C:\CybertechGestao
echo [2/4] Atualizando arquivos no diretorio oficial C:\CybertechGestao...
set "DEST=C:\CybertechGestao"
if not exist "%DEST%" mkdir "%DEST%"

:: Copia pastas essenciais
if exist "%~dp0dist" xcopy /E /Y /R /C /Q "%~dp0dist" "%DEST%\dist\" >nul 2>&1
if exist "%~dp0backend" xcopy /E /Y /R /C /Q "%~dp0backend" "%DEST%\backend\" >nul 2>&1
if exist "%~dp0public" xcopy /E /Y /R /C /Q "%~dp0public" "%DEST%\public\" >nul 2>&1

:: Copia arquivos do backend e scripts
copy /Y "%~dp0backend_api.cjs" "%DEST%\" >nul 2>&1
copy /Y "%~dp0utils_text_cleaner.cjs" "%DEST%\" >nul 2>&1
copy /Y "%~dp0package.json" "%DEST%\" >nul 2>&1
copy /Y "%~dp0install-service.js" "%DEST%\" >nul 2>&1
copy /Y "%~dp0uninstall-service.js" "%DEST%\" >nul 2>&1
if exist "%~dp0campanhas.json" copy /Y "%~dp0campanhas.json" "%DEST%\" >nul 2>&1
if exist "%~dp0metas_data.json" copy /Y "%~dp0metas_data.json" "%DEST%\" >nul 2>&1
if exist "%~dp0mobile_users.json" copy /Y "%~dp0mobile_users.json" "%DEST%\" >nul 2>&1
if exist "%~dp0cliente-config.env" copy /Y "%~dp0cliente-config.env" "%DEST%\" >nul 2>&1

:: Copia scripts utilitarios
copy /Y "%~dp0Ver_IP_e_Links_de_Acesso.bat" "%DEST%\" >nul 2>&1
copy /Y "%~dp0Configurar_Dominio_Local.bat" "%DEST%\" >nul 2>&1
copy /Y "%~dp0Instalar-Simulador-Smartphone.bat" "%DEST%\" >nul 2>&1
copy /Y "%~dp0Configurar_DataCISS.bat" "%DEST%\" >nul 2>&1
copy /Y "%~dp0setup-dataciss.js" "%DEST%\" >nul 2>&1
copy /Y "%~dp02-Atualizar_Sistema.bat" "%DEST%\" >nul 2>&1
copy /Y "%~dp0Atualizar_Reiniciar.bat" "%DEST%\" >nul 2>&1

echo [OK] Novos arquivos copiados com sucesso!
echo.

:: 4. Reiniciando ou reinstalando o servico do Windows
echo [3/4] Reiniciando o servico do servidor em segundo plano...
cd /d "%DEST%"

:: Tenta iniciar direto pelo servico existente
sc query "cybertechgestaoapi" | find "STATE" >nul 2>&1
if %errorLevel% == 0 (
    net start "cybertechgestaoapi.exe" >nul 2>&1 || net start "Cybertech Gestao API" >nul 2>&1 || sc start "cybertechgestaoapi" >nul 2>&1
    echo [OK] Servico reiniciado!
) else (
    echo Instalando o servico pela primeira vez...
    call npm install --no-audit --no-fund >nul 2>&1
    node install-service.js
)

:: Aguarda o servico subir
ping 127.0.0.1 -n 4 >nul

echo.
echo [4/4] Verificando conexao...
netstat -aon | find "3001" | find "LISTENING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servidor Principal (Porta 3001) online!
) else (
    echo [AVISO] Iniciando processo alternativo de garantia...
    start /b node backend_api.cjs
)

netstat -aon | find "8082" | find "LISTENING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Servidor Mobile (Porta 8082) online!
)

echo.
color 0A
echo ========================================================
echo       ATUALIZACAO CONCLUIDA COM SUCESSO!
echo ========================================================
echo.
echo ⚠️  ATENCAO - MUITO IMPORTANTE:
echo     O navegador do cliente guarda o sistema antigo em cache!
echo.
echo     Para carregar a nova versao:
echo     1. Abra o navegador onde o sistema esta aberto
echo     2. Aperte as teclas: CTRL + F5 (para limpar o cache)
echo     3. Ou abra em uma aba anonima para testar imediatamente!
echo.
echo 📱 Acesso Mobile:
echo     - No computador: http://smartcybertech:8082 (ou http://localhost:8082)
echo     - Na rede/celular: Veja no arquivo Ver_IP_e_Links_de_Acesso.bat
echo ========================================================
echo.
pause
