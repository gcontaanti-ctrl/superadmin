@echo off
chcp 65001 > nul
title Instalador do Simulador Smartphone Mobile

echo ========================================================
echo   📱 INSTALADOR DO SIMULADOR SMARTPHONE MOBILE UNIVERSAL
echo ========================================================
echo.
echo Copiando arquivo do Simulador para a sua Área de Trabalho...

set "SRC=%~dp0public\Simulador-Smartphone-Universal.html"
set "DEST_DIR=%USERPROFILE%\Desktop"
set "DEST_FILE=%DEST_DIR%\Simulador-Smartphone-Universal.html"
set "SHORTCUT=%DEST_DIR%\📱 Simulador Smartphone Mobile.url"

copy /Y "%SRC%" "%DEST_FILE%" > nul

echo [InternetShortcut] > "%SHORTCUT%"
echo URL=file:///%DEST_FILE:\=/% >> "%SHORTCUT%"
echo IconIndex=0 >> "%SHORTCUT%"

echo.
echo ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!
echo --------------------------------------------------------
echo Um atalho chamado "📱 Simulador Smartphone Mobile" foi
echo criado diretamente na sua Área de Trabalho (Desktop)!
echo.
echo Você pode dar 2 cliques nele a qualquer momento para
echo testar QUALQUER projeto ou porta (ex: :3000, :5173, :8080)!
echo --------------------------------------------------------
echo.
pause
