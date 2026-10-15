@echo off
color 0C
title Desinstalar Servidor Cybertech Desta Maquina
chcp 65001 >nul 2>&1

echo ========================================================
echo   DESINSTALAR SERVIDOR CYBERTECH DESTA MÁQUINA
echo ========================================================
echo.
echo Este procedimento remove o serviço de inicialização automática
echo do Windows e encerra a execução do servidor neste computador.
echo (Use isto caso esteja migrando o servidor para outra máquina).
echo.

:: Verifica Permissoes de Administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERRO] Você precisa executar como Administrador!
    echo Clique com o botão direito neste arquivo e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)

echo [1/2] Parando e removendo o serviço do Windows...
node "%~dp0uninstall-service.js"

echo.
echo [2/2] Removendo regra do Firewall...
netsh advfirewall firewall delete rule name="Cybertech Gestao API" >nul 2>&1
netsh advfirewall firewall delete rule name="Cybertech Gestao API OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="Cybertech Gestao (Porta 3001)" >nul 2>&1

echo.
color 0A
echo ========================================================
echo   SERVIDOR REMOVIDO COM SUCESSO DESTA MÁQUINA!
echo ========================================================
echo.
pause
