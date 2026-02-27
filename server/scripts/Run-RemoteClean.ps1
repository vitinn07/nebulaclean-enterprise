# Executa limpeza remota via Invoke-Command (PowerShell Remoting)
# Uso: .\Run-RemoteClean.ps1 -Computers "host1,host2" -ScriptPath "C:\path\to\Clean-Local.ps1"
param(
    [Parameter(Mandatory)] [string]$Computers,
    [Parameter(Mandatory)] [string]$ScriptPath
)

$ErrorActionPreference = 'Continue'
$computerList = @($Computers -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })

$results = @()
foreach ($c in $computerList) {
    $r = @{ Computer = $c; Success = $false; Output = ''; Error = '' }
    try {
        $out = Invoke-Command -ComputerName $c -FilePath $ScriptPath -ArgumentList 0, 1, 1, 1, 0 -ErrorAction Stop
        $r.Output = ($out | Out-String).Trim()
        $r.Success = $true
    } catch {
        $r.Error = $_.Exception.Message
    }
    $results += $r
}

$results | ConvertTo-Json -Depth 4 -Compress
