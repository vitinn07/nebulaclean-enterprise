# Descobre maquinas na rede (ARP + resolucao de nome)
# Saida: JSON array de { ip, hostname }
$ErrorActionPreference = 'SilentlyContinue'

$list = @()
$arp = arp -a 2>$null
foreach ($line in $arp) {
    if ($line -match '^\s*([0-9.]+)\s+') {
        $ip = $matches[1]
        if ($ip -eq '0.0.0.0' -or $ip -match '^255\.' -or $ip -match '^127\.') { continue }
        $hostname = $null
        try {
            $hostname = [System.Net.Dns]::GetHostEntry($ip).HostName
        } catch { }
        if (-not $hostname) { $hostname = $ip }
        $list += @{ ip = $ip; hostname = $hostname }
    }
}
$list | ConvertTo-Json -Compress
