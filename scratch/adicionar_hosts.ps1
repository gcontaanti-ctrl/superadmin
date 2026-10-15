$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1       smartcybertech"
$entry2 = "192.168.90.160 smartcybertech"

try {
    $content = Get-Content $hostsPath -Encoding UTF8 -ErrorAction Stop
    $filtered = $content | Where-Object { $_ -notmatch 'smartcybertech' }
    $newContent = @()
    $newContent += $filtered
    $newContent += ""
    $newContent += "# --- SmartCybertech ---"
    $newContent += $entry
    $newContent += $entry2
    $newContent += "# ----------------------"
    Set-Content -Path $hostsPath -Value $newContent -Encoding UTF8 -ErrorAction Stop
    Write-Output "SUCCESS: smartcybertech adicionado com sucesso ao arquivo hosts!"
} catch {
    Write-Output "NEED_ADMIN: $($_.Exception.Message)"
}
