param(
    [string]$RootPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $RootPath) {
    $RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$global:NebulaPaths = [ordered]@{
    Root       = $RootPath
    ConfigFile = Join-Path $RootPath '..\config\settings.json'
    LogDir     = Join-Path $RootPath '..\logs'
    LogFile    = Join-Path $RootPath '..\logs\nebula.log'
    Progress   = Join-Path $RootPath '..\logs\progress.json'
}

if (-not (Test-Path $global:NebulaPaths.LogDir)) {
    New-Item -Path $global:NebulaPaths.LogDir -ItemType Directory -Force | Out-Null
}

function Write-NebulaLog {
    param(
        [string]$Message,
        [string]$Level = 'INFO'
    )
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $global:NebulaPaths.LogFile -Value $line
}

function Initialize-NebulaConfig {
    if (-not (Test-Path $global:NebulaPaths.ConfigFile)) {
        $default = @{
            SimulationMode = $true
            Targets        = @(
                @{
                    Id            = 'TempUser'
                    Name          = '%TEMP%'
                    Path          = $env:TEMP
                    RequiresAdmin = $false
                    Enabled       = $true
                },
                @{
                    Id            = 'WindowsTemp'
                    Name          = 'C:\Windows\Temp'
                    Path          = 'C:\Windows\Temp'
                    RequiresAdmin = $true
                    Enabled       = $true
                },
                @{
                    Id            = 'LocalAppDataTemp'
                    Name          = '%AppData%\Local\Temp'
                    Path          = (Join-Path $env:LOCALAPPDATA 'Temp')
                    RequiresAdmin = $false
                    Enabled       = $true
                },
                @{
                    Id            = 'Prefetch'
                    Name          = 'C:\Windows\Prefetch'
                    Path          = 'C:\Windows\Prefetch'
                    RequiresAdmin = $true
                    Enabled       = $true
                    Policy        = @{
                        Mode          = 'OlderThanDays'
                        Days          = 7
                        ExcludeFiles  = @('Layout.ini')
                    }
                },
                @{
                    Id            = 'SoftwareDistribution'
                    Name          = 'SoftwareDistribution\Download'
                    Path          = 'C:\Windows\SoftwareDistribution\Download'
                    RequiresAdmin = $true
                    Enabled       = $true
                }
            )
            Schedule      = @{
                Enabled = $false
                Time    = '03:00'
            }
        }
        $default | ConvertTo-Json -Depth 6 | Set-Content -Path $global:NebulaPaths.ConfigFile -Encoding UTF8
        Write-NebulaLog "Configuracao padrao criada em $($global:NebulaPaths.ConfigFile)"
    }
}

function Get-NebulaConfig {
    Initialize-NebulaConfig
    (Get-Content -Path $global:NebulaPaths.ConfigFile -Raw) | ConvertFrom-Json
}

function Save-NebulaConfig {
    param(
        [Parameter(Mandatory)]
        $Config
    )
    $Config | ConvertTo-Json -Depth 6 | Set-Content -Path $global:NebulaPaths.ConfigFile -Encoding UTF8
    Write-NebulaLog "Configuracao atualizada."
}

function Get-IsAdmin {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Initialize-NebulaProgress {
    param(
        [string]$Status = 'idle'
    )
    $progress = @{
        Status        = $Status
        Phase         = 'idle'
        CurrentTarget = $null
        Processed     = 0
        Total         = 0
        Percent       = 0
        Simulation    = $true
        FreedBytes    = 0
        Timestamp     = (Get-Date).ToString('o')
    }
    Set-NebulaProgressFile -ProgressObject $progress
}

function Update-NebulaProgress {
    param(
        [string]$Status,
        [string]$Phase = $null,
        [string]$CurrentTarget,
        [int]$Processed,
        [int]$Total,
        [long]$FreedBytes,
        [bool]$Simulation
    )
    $percent = 0
    if ($Total -gt 0) {
        $percent = [math]::Round(($Processed / $Total) * 100, 1)
    }
    $progress = @{
        Status        = $Status
        Phase         = if ($null -ne $Phase) { $Phase } else { 'cleaning' }
        CurrentTarget = $CurrentTarget
        Processed     = $Processed
        Total         = $Total
        Percent       = $percent
        Simulation    = $Simulation
        FreedBytes    = $FreedBytes
        Timestamp     = (Get-Date).ToString('o')
    }
    Set-NebulaProgressFile -ProgressObject $progress
}

function Set-NebulaProgressFile {
    param(
        [Parameter(Mandatory)]
        $ProgressObject
    )
    $json = $ProgressObject | ConvertTo-Json -Depth 4
    $temp = "$($global:NebulaPaths.Progress).tmp"
    [System.IO.File]::WriteAllText($temp, $json, [System.Text.Encoding]::UTF8)
    Move-Item -Path $temp -Destination $global:NebulaPaths.Progress -Force
}

function Read-NebulaProgressFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )
    $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    try {
        $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8, $true)
        try {
            return $sr.ReadToEnd()
        }
        finally {
            $sr.Close()
        }
    }
    finally {
        $fs.Close()
    }
}

function Get-NebulaProgress {
    if (Test-Path $global:NebulaPaths.Progress) {
        for ($i = 0; $i -lt 5; $i++) {
            try {
                $raw = Read-NebulaProgressFile -Path $global:NebulaPaths.Progress
                if ($raw) {
                    return $raw | ConvertFrom-Json
                }
            }
            catch {
                Start-Sleep -Milliseconds 40
            }
        }
        return [PSCustomObject]@{
            Status        = 'running'
            Phase         = 'enumerating'
            CurrentTarget = 'Aguardando acesso ao progresso...'
            Processed     = 0
            Total         = 0
            Percent       = 0
            Simulation    = $true
            FreedBytes    = 0
            Timestamp     = (Get-Date).ToString('o')
        }
    }
    else {
        Initialize-NebulaProgress
        return Get-NebulaProgress
    }
}

function Get-TargetItems {
    param(
        [Parameter(Mandatory)]
        $Target
    )

    # Expande variaveis de ambiente para suportar valores como %TEMP% e %LOCALAPPDATA%
    $path = [Environment]::ExpandEnvironmentVariables($Target.Path)
    if (-not (Test-Path $path)) {
        Write-NebulaLog "Pasta nao encontrada: $path"
        return @()
    }

    $items = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue

    if ($Target.Id -eq 'Prefetch' -and $Target.Policy) {
        $cutoff = (Get-Date).AddDays(-[int]$Target.Policy.Days)
        $exclude = @($Target.Policy.ExcludeFiles)
        $items = $items | Where-Object {
            $_.LastWriteTime -lt $cutoff -and
            ($exclude -notcontains $_.Name)
        }
    }

    return $items
}

function Invoke-NebulaClean {
    param(
        [bool]$Simulation = $true,
        [string[]]$SelectedTargetIds = $null
    )

    Initialize-NebulaConfig
    $config = Get-NebulaConfig
    $isAdmin = Get-IsAdmin

    $targets = $config.Targets | Where-Object { $_.Enabled }
    if ($SelectedTargetIds) {
        $targets = $targets | Where-Object { $SelectedTargetIds -contains $_.Id }
    }

    [long]$freedBytes = 0
    $processed = 0
    $total = 0

    Write-NebulaLog "NebulaClean iniciado. Modo simulacao: $Simulation"
    Update-NebulaProgress -Status 'running' -Phase 'enumerating' -CurrentTarget 'Preparando lista de arquivos...' -Processed 0 -Total 0 -FreedBytes 0 -Simulation $Simulation

    foreach ($t in $targets) {
        if ($t.RequiresAdmin -and -not $isAdmin) { continue }
        Update-NebulaProgress -Status 'running' -Phase 'enumerating' -CurrentTarget "Listando: $($t.Name)" -Processed 0 -Total 0 -FreedBytes 0 -Simulation $Simulation
        $items = @(Get-TargetItems -Target $t)
        $total += $items.Count
    }

    Write-NebulaLog "Total de itens a processar: $total"
    Update-NebulaProgress -Status 'running' -Phase 'cleaning' -CurrentTarget '' -Processed 0 -Total $total -FreedBytes 0 -Simulation $Simulation

    foreach ($t in $targets) {
        if ($t.RequiresAdmin -and -not $isAdmin) { continue }
        $items = @(Get-TargetItems -Target $t)
        foreach ($item in $items) {
            $processed++
            Update-NebulaProgress -Status 'running' -Phase 'cleaning' -CurrentTarget $t.Name -Processed $processed -Total $total -FreedBytes $freedBytes -Simulation $Simulation
            try {
                if ($item.PSIsContainer) { continue }
                $size = $item.Length
                if ($Simulation) {
                    $freedBytes += $size
                }
                else {
                    try {
                        $freedBytes += $size
                        Remove-Item -LiteralPath $item.FullName -Force -ErrorAction Stop
                        Write-NebulaLog "Removido: $($item.FullName) ($size bytes)"
                    }
                    catch [System.IO.IOException] {
                        Write-NebulaLog "Arquivo em uso, ignorado: $($item.FullName)" 'WARN'
                    }
                    catch [System.UnauthorizedAccessException] {
                        Write-NebulaLog "Sem permissao: $($item.FullName)" 'WARN'
                    }
                }
            }
            catch {
                Write-NebulaLog "Erro: $($item.FullName) - $($_.Exception.Message)" 'ERROR'
            }
        }
    }

    Update-NebulaProgress -Status 'completed' -Phase 'idle' -CurrentTarget '' -Processed $processed -Total $total -FreedBytes $freedBytes -Simulation $Simulation
    $freedMB = [math]::Round($freedBytes / 1MB, 2)
    Write-NebulaLog "NebulaClean concluido. Itens processados: $processed. Espaco liberado (estimado): $freedMB MB. Simulacao: $Simulation"

    return [PSCustomObject]@{
        ProcessedItems = $processed
        FreedBytes     = $freedBytes
        Simulation     = $Simulation
    }
}

function Get-NebulaDiskInfo {
    $drive = Get-PSDrive -Name C -ErrorAction SilentlyContinue
    if (-not $drive) {
        return $null
    }
    return [PSCustomObject]@{
        Name       = $drive.Name
        Used       = $drive.Used
        Free       = $drive.Free
        Total      = $drive.Used + $drive.Free
        UsedPct    = [math]::Round(($drive.Used / ($drive.Used + $drive.Free)) * 100, 1)
        FreePct    = [math]::Round(($drive.Free / ($drive.Used + $drive.Free)) * 100, 1)
    }
}

function Get-NebulaLogs {
    param(
        [int]$Last = 200
    )
    if (-not (Test-Path $global:NebulaPaths.LogFile)) {
        return @()
    }
    Get-Content -Path $global:NebulaPaths.LogFile -Tail $Last
}

function Set-NebulaSchedule {
    param(
        [bool]$Enabled,
        [string]$Time = '03:00'
    )

    $taskName = 'NebulaCleanEnterprise'
    $launcher = Join-Path $global:NebulaPaths.Root '..\launcher.bat'

    if (-not (Test-Path $launcher)) {
        Write-NebulaLog "Launcher nao encontrado para agendamento: $launcher" 'WARN'
        return
    }

    if (-not (Get-IsAdmin)) {
        Write-NebulaLog 'Tentativa de configurar agendamento sem privilegios administrativos.' 'WARN'
        return
    }

    if (-not $Enabled) {
        schtasks /Delete /TN $taskName /F 2>&1 | Out-Null
        Write-NebulaLog "Agendamento desabilitado (tarefa removida) se existente."
        return
    }

    $timePart = $Time
    schtasks /Create /SC DAILY /TN $taskName /TR "`"$launcher`"" /ST $timePart /F 2>&1 | Out-Null
    Write-NebulaLog "Agendamento diario configurado para $timePart."
}
