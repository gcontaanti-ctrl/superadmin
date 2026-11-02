@echo off
setlocal EnableDelayedExpansion
title Enderecos de Acesso - Cybertech Gestao Albuquerque
color 0B
chcp 65001 >nul 2>&1

node "%~dp0mostrar_ip_rede.cjs"

echo.
echo Pressione qualquer tecla para abrir o sistema neste computador...
echo (Ou feche esta janela se nao quiser abrir agora)
pause >nul

start http://localhost:3001
