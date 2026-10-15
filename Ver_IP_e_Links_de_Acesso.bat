@echo off
color 0B
title Cybertech Gestao - Enderecos de Acesso
chcp 65001 >nul 2>&1

set DOMAIN_NAME=smartcybertech
set PORTA=3001

echo ============================================================
echo         SMARTCYBERTECH GESTÃO - ENDEREÇOS DE ACESSO
echo ============================================================
echo.
echo  [ACESSO PELO NOME (recomendado neste computador)]:
echo     Painel:         http://%DOMAIN_NAME%:%PORTA%
echo     App Mobile:     http://%DOMAIN_NAME%:8082
echo.
echo  [ACESSO ALTERNATIVO (localhost)]:
echo     Painel:         http://localhost:%PORTA%
echo     App Mobile:     http://localhost:8082
echo.
echo  ------------------------------------------------------------
echo  [LINKS PARA ABRIR NO CELULAR / SMARTPHONE NA MESMA REDE]:
echo  (Use o IP abaixo para celulares que nao foram configurados)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | ForEach-Object { Write-Host ('   Painel (nome): http://%DOMAIN_NAME%:%PORTA%') -ForegroundColor Yellow; Write-Host ('   Painel (IP):   http://' + $_.IPAddress + ':%PORTA%') -ForegroundColor Green; Write-Host ('   Mobile Gerente: http://' + $_.IPAddress + ':8082') -ForegroundColor Cyan; Write-Host '' }"

echo.
echo  ------------------------------------------------------------
echo  PARA OUTROS PCs ACESSAREM PELO NOME "%DOMAIN_NAME%":
echo     Execute como ADMINISTRADOR em cada maquina cliente:
echo     >> Configurar_Cliente_Rede.bat <<
echo.
echo  Sem esse script, use o link com IP direto listado acima.
echo ============================================================
echo.
echo Pressione qualquer tecla para abrir o sistema no navegador...
pause >nul

start http://%DOMAIN_NAME%:%PORTA%
