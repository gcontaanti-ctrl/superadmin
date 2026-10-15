$csc = "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$source = "c:\Users\tisup\Desktop\projeto\super-admin\scratch\InstallerForm.cs"
$zip = "$env:USERPROFILE\Desktop\Instalador_Servidor_Completo.zip"
$out = "$env:USERPROFILE\Desktop\Instalador_SmartCybertech_Setup.exe"

if (-not (Test-Path $zip)) {
    Write-Error "Arquivo ZIP nao encontrado em: $zip"
    exit 1
}

Write-Output "Compilando Instalador Executavel Unico (Setup.exe)..."
$args = @(
    "/target:winexe",
    "/optimize+",
    "/out:$out",
    "/resource:$zip,PackageZip",
    "/r:System.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.Drawing.dll",
    "/r:System.IO.Compression.dll",
    "/r:System.IO.Compression.FileSystem.dll",
    $source
)

$process = Start-Process -FilePath $csc -ArgumentList $args -NoNewWindow -Wait -PassThru

if ($process.ExitCode -eq 0 -and (Test-Path $out)) {
    $sizeMb = (Get-Item $out).Length / 1MB
    Write-Output "SUCCESS: Instalador unico (.exe) gerado com sucesso!"
    Write-Output "Caminho: $out"
    Write-Output "Tamanho: $([math]::Round($sizeMb, 2)) MB"
} else {
    Write-Error "Falha na compilacao do instalador. Codigo: $($process.ExitCode)"
    exit 1
}
