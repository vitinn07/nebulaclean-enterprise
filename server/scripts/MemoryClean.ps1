# NebulaClean - Limpeza de memoria RAM (GC, explorer, DNS, opcional EmptyStandbyList)
# Uso: .\MemoryClean.ps1 -RunGC 0|1 -RestartExplorer 0|1 -FlushDns 0|1 -EmptyStandbyListPath "path\to\EmptyStandbyList.exe" ou ""
param(
    [int]$RunGC = 1,
    [int]$RestartExplorer = 0,
    [int]$FlushDns = 1,
    [string]$EmptyStandbyListPath = ""
)

$ErrorActionPreference = 'Continue'
$log = New-Object System.Collections.ArrayList

function Write-Log { param($Msg) $null = $log.Add($Msg); Write-Host $Msg }

if ($RunGC -eq 1) {
    try {
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        Write-Log "GC executado."
    } catch {
        Write-Log "GC: $($_.Message)"
    }
}

if ($FlushDns -eq 1) {
    try {
        ipconfig /flushdns 2>&1 | Out-Null
        Write-Log "DNS limpo."
    } catch {
        Write-Log "flushdns: $($_.Message)"
    }
}

if ($RestartExplorer -eq 1) {
    try {
        Stop-Process -Name explorer -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
        Start-Process explorer
        Write-Log "Explorer reiniciado."
    } catch {
        Write-Log "Explorer: $($_.Message)"
    }
}

if ($EmptyStandbyListPath -and (Test-Path -LiteralPath $EmptyStandbyListPath)) {
    try {
        & $EmptyStandbyListPath standbylist
        Write-Log "EmptyStandbyList executado."
    } catch {
        Write-Log "EmptyStandbyList: $($_.Message)"
    }
}

Write-Log "Fim limpeza de memoria."
$log -join "`n"
