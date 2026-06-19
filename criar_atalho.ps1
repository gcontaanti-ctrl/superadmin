$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\SUPER ANALYTICS.lnk")
$Shortcut.TargetPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$Shortcut.Arguments = "--app=http://localhost:3001"
$Shortcut.Description = "SUPER ANALYTICS - Super Admin"
$Shortcut.IconLocation = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe,0"
$Shortcut.Save()
Write-Host "Atalho criado com sucesso!"
