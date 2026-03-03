# Executa limpeza remota via PowerShell Remoting sem depender de caminho físico do script na máquina remota
# Uso: .\Run-RemoteClean.ps1 -Computers "host1,host2" -ScriptPath "C:\path\to\Clean-Local.ps1"
param(
    [Parameter(Mandatory)] [string]$Computers,
    [Parameter(Mandatory)] [string]$ScriptPath
)

$ErrorActionPreference = 'Continue'
$computerList = @($Computers -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })

if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "ScriptPath nao encontrado: $ScriptPath"
}

# Envia o conteúdo do Clean-Local.ps1 para o host remoto como scriptblock
$scriptContent = Get-Content -LiteralPath $ScriptPath -Raw

# Parametros fixos usados na execucao remota (simulacao off, cleanmgr/dns/lixeira on, DISM off)
$simulation = 0
$runCleanmgr = 1
$flushDns = 1
$clearRecycleBin = 1
$runDism = 0

$results = @()
foreach ($c in $computerList) {
    $r = @{ Computer = $c; Success = $false; Output = ''; Error = '' }
    try {
        $out = Invoke-Command -ComputerName $c -ScriptBlock {
            param(
                [string]$ScriptText,
                [int]$Simulation,
                [int]$RunCleanmgr,
                [int]$FlushDns,
                [int]$ClearRecycleBin,
                [int]$RunDism
            )
            $sb = [scriptblock]::Create($ScriptText)
            & $sb -Simulation $Simulation -RunCleanmgr $RunCleanmgr -FlushDns $FlushDns -ClearRecycleBin $ClearRecycleBin -RunDism $RunDism
        } -ArgumentList $scriptContent, $simulation, $runCleanmgr, $flushDns, $clearRecycleBin, $runDism -ErrorAction Stop

        $r.Output = ($out | Out-String).Trim()
        $r.Success = $true
    } catch {
        $r.Error = $_.Exception.Message
    }
    $results += $r
}

$results | ConvertTo-Json -Depth 4 -Compress
