@echo off
color 0B
echo ========================================================
echo        Atualizador - Cybertech Gestao (ERP Local)
echo ========================================================
echo.

:: Verifica Permissoes de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Permissoes de Administrador confirmadas.
) else (
    color 0C
    echo [ERRO FATAL] Voce precisa de privilegios de Administrador!
    echo Clique com o botao direito neste arquivo (2-Atualizar_Sistema.bat)
    echo e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)

echo.
echo [1/3] Copiando e sobrescrevendo os novos arquivos no C:\CybertechGestao...
:: xcopy vai copiar todos os arquivos do zip pra pasta oficial, substituindo os antigos.
:: O arquivo de configuracao do banco (db-config.json) nao eh apagado, pois ele fica na pasta .runtime
xcopy /E /Y /Q "%~dp0*" "C:\CybertechGestao\"

echo.
echo [2/3] Atualizando pacotes do sistema (se necessario)...
cd /d "C:\CybertechGestao"
call npm install --no-audit --no-fund

echo.
echo [3/3] Reiniciando o Servico do Windows...
:: O node-windows ja detecta que existe e reinicia
node install-service.js

echo.
color 0A
echo ========================================================
echo     SISTEMA ATUALIZADO COM SUCESSO!
echo ========================================================
echo O sistema ja esta rodando com as novidades em segundo plano.
echo.
echo Va para a tela do sistema e aperte CTRL + F5 para recarregar!
echo.
pause
