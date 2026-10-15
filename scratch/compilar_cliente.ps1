$csc = "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$source = "c:\Users\tisup\Desktop\projeto\super-admin\scratch\ClientInstallerForm.cs"
$out = "$env:USERPROFILE\Desktop\Instalador_Cliente_Rede.exe"

Write-Output "Compilando Instalador Cliente de Rede (.exe)..."
$args = @(
    "/target:winexe",
    "/optimize+",
    "/out:$out",
    "/r:System.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.Drawing.dll",
    $source
)

$process = Start-Process -FilePath $csc -ArgumentList $args -NoNewWindow -Wait -PassThru

if ($process.ExitCode -eq 0 -and (Test-Path $out)) {
    $sizeKb = (Get-Item $out).Length / 1KB
    Write-Output "SUCCESS: Instalador do Cliente gerado com sucesso!"
    Write-Output "Caminho: $out"
    Write-Output "Tamanho: $([math]::Round($sizeKb, 2)) KB"
} else {
    Write-Error "Falha na compilacao do cliente. Codigo: $($process.ExitCode)"
    exit 1
}
