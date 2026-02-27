# NebulaClean - Limpeza local (pastas + comandos opcionais)
# Uso: .\Clean-Local.ps1 -Simulation 0|1 -RunCleanmgr 0|1 -FlushDns 0|1 -ClearRecycleBin 0|1 -RunDism 0|1
param(
    [int]$Simulation = 1,
    [int]$RunCleanmgr = 0,
    [int]$FlushDns = 0,
    [int]$ClearRecycleBin = 0,
    [int]$RunDism = 0
)

$ErrorActionPreference = 'Continue'
$log = New-Object System.Collections.ArrayList

function Write-Log { param($Msg) $null = $log.Add($Msg); Write-Host $Msg }

$paths = @(
    @{ Name = '%TEMP%'; Path = $env:TEMP },
    @{ Name = 'Local\Temp'; Path = (Join-Path $env:LOCALAPPDATA 'Temp') },
    @{ Name = 'C:\Windows\Temp'; Path = 'C:\Windows\Temp' },
    @{ Name = 'C:\Windows\Prefetch'; Path = 'C:\Windows\Prefetch' },
    @{ Name = 'Recent'; Path = (Join-Path $env:USERPROFILE 'Recent') },
    @{ Name = 'ProgramData\Temp'; Path = (Join-Path $env:ProgramData 'Temp') }
)

$totalFreed = 0
$sim = ($Simulation -eq 1)

Write-Log "Inicio limpeza local. Simulacao: $sim"

foreach ($p in $paths) {
    $resolved = [Environment]::ExpandEnvironmentVariables($p.Path)
    if (-not (Test-Path -LiteralPath $resolved)) { continue }
    try {
        $items = Get-ChildItem -Path $resolved -Recurse -Force -ErrorAction SilentlyContinue
        if ($p.Name -like '*Prefetch*') {
            $cutoff = (Get-Date).AddDays(-7)
            $exclude = @('Layout.ini')
            $items = $items | Where-Object { -not $_.PSIsContainer -and $_.LastWriteTime -lt $cutoff -and $exclude -notcontains $_.Name }
        }
        foreach ($item in $items) {
            if ($item.PSIsContainer) { continue }
            $size = $item.Length
            if ($sim) {
                $totalFreed += $size
            } else {
                try {
                    Remove-Item -LiteralPath $item.FullName -Force -ErrorAction Stop
                    $totalFreed += $size
                } catch { }
            }
        }
    } catch {
        Write-Log "Erro em $($p.Name): $($_.Message)"
    }
}

if ($ClearRecycleBin -eq 1 -and -not $sim) {
    try {
        Clear-RecycleBin -Force -ErrorAction Stop
        Write-Log "Lixeira esvaziada."
    } catch {
        Write-Log "Lixeira: $($_.Message)"
    }
}

if ($RunCleanmgr -eq 1 -and -not $sim) {
    try {
        Start-Process -FilePath 'cleanmgr' -ArgumentList '/sagerun:1' -Wait -WindowStyle Hidden
        Write-Log "Cleanmgr executado."
    } catch {
        Write-Log "Cleanmgr: $($_.Message)"
    }
}

if ($FlushDns -eq 1 -and -not $sim) {
    try {
        ipconfig /flushdns 2>&1 | Out-Null
        Write-Log "DNS limpo."
    } catch {
        Write-Log "flushdns: $($_.Message)"
    }
}

if ($RunDism -eq 1 -and -not $sim) {
    try {
        Start-Process -FilePath 'DISM.exe' -ArgumentList '/Online', '/Cleanup-Image', '/StartComponentCleanup' -Wait -WindowStyle Hidden
        Write-Log "DISM executado."
    } catch {
        Write-Log "DISM: $($_.Message)"
    }
}

Write-Log "Fim. Espaco liberado (bytes): $totalFreed"
$log -join "`n"
