@echo off
color 0B
title Cybertech Gestao - Configurar Servidor Nuvem DataCISS
chcp 65001 >nul 2>&1

cd /d "%~dp0"
node setup-dataciss.js

echo.
echo Pressione qualquer tecla para sair...
pause >nul
