@echo off
color 0B
echo ========================================================
echo         Reiniciar / Atualizar - Cybertech Gestao
echo ========================================================
echo.

:: Verifica Permissoes de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Permissoes de Administrador confirmadas.
) else (
    color 0C
    echo [ERRO FATAL] Voce precisa de privilegios de Administrador!
    echo Clique com o botao direito neste arquivo e selecione "Executar como Administrador".
    echo.
    pause
    exit /b
)

echo.
echo Reiniciando o servico em segundo plano...
:: Para o servico e inicia novamente para carregar novos arquivos
node install-service.js

echo.
color 0A
echo ========================================================
echo     SISTEMA REINICIADO COM SUCESSO!
echo ========================================================
echo Se voce copiou arquivos de atualizacao por cima desta pasta,
echo a nova versao ja esta rodando!
echo.
echo Va no navegador do cliente e aperte CTRL+F5.
echo.
pause
