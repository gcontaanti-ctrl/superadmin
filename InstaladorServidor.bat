@echo off
color 0A
title Instalacao do Servidor Super Admin
echo ===================================================
echo   INSTALADOR DO SERVIDOR SUPER ADMIN
echo ===================================================
echo.
echo Solicitando privilegios de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRO: Por favor, clique com o botao direito neste arquivo e selecione "Executar como administrador".
    pause
    exit /b
)

echo.
echo [1/3] Instalando dependencias do servico...
call npm install node-windows

echo.
echo [2/3] Criando Servico do Windows...
node create_service.js

echo.
echo [3/3] Criando atalho na Area de Trabalho...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Super Admin.lnk'); $Shortcut.TargetPath = 'msedge.exe'; $Shortcut.Arguments = '--app=http://localhost:8080'; $Shortcut.IconLocation = 'msedge.exe,0'; $Shortcut.Save()"

echo.
echo ===================================================
echo INSTALACAO CONCLUIDA!
echo O servidor agora esta rodando silenciosamente no fundo como um Servico do Windows.
echo Ele vai iniciar automaticamente sempre que ligar o PC do Servidor.
echo.
echo Para acessar em outros computadores na mesma rede,
echo descubra o IP deste servidor e abra no navegador:
echo.
for /f "tokens=1-2 cols=2" %%A in ('ipconfig ^| find "IPv4"') do echo   Navegador: http://%%B:8080
echo ===================================================
pause
