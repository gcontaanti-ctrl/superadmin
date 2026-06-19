$ProjectDir = "C:\Users\tisup\Desktop\projeto\super-admin"
$DesktopDir = [Environment]::GetFolderPath("Desktop")

# 1. Criar start-servers.bat
$BatPath = Join-Path $ProjectDir "start-servers.bat"
$BatContent = @"
@echo off
cd /d "%~dp0"
:: Mata processos antigos na porta 3001 e 8080 para evitar conflitos
for /f "tokens=5" %%a in ('netstat -aon ^| find "3001" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find "8080" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo Iniciando Backend...
start /b node backend_api.cjs
echo Iniciando Frontend...
start /b npm run dev

echo Aguardando servidores...
timeout /t 5 /nobreak >nul

:: Tenta abrir no Edge em modo app, se nao abre padrao
start msedge --app=http://localhost:8080 || start http://localhost:8080
"@
[IO.File]::WriteAllText($BatPath, $BatContent)

# 2. Criar iniciar.vbs (inicia o bat oculto)
$VbsPath = Join-Path $ProjectDir "iniciar.vbs"
$VbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "$BatPath" & Chr(34), 0
Set WshShell = Nothing
"@
[IO.File]::WriteAllText($VbsPath, $VbsContent)

# 3. Criar Atalho na Area de Trabalho
$ShortcutPath = Join-Path $DesktopDir "Super Admin.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$VbsPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "msedge.exe,0" # Usa o icone do navegador
$Shortcut.Save()

Write-Host "Configuracao concluida! Um atalho 'Super Admin' foi criado na Area de Trabalho."
