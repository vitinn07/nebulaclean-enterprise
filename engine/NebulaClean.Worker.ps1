param(
    [string]$Root,
    [string]$SimulationFlag = '1',
    [string]$SelectedIdsCsv = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$engineRoot = if ($Root) { $Root } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
. (Join-Path $engineRoot 'NebulaClean.Core.ps1') -RootPath $engineRoot

$simulation = $SimulationFlag -eq '1'
$selectedIds = @()
if ($SelectedIdsCsv) {
    $selectedIds = @($SelectedIdsCsv -split ',' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

Write-NebulaLog "Worker iniciado. Simulacao: $simulation. Alvos: $($selectedIds -join ',')"

try {
    Invoke-NebulaClean -Simulation:$simulation -SelectedTargetIds $selectedIds | Out-Null
    Write-NebulaLog 'Worker finalizado com sucesso.'
}
catch {
    Write-NebulaLog "Worker falhou: $($_.Exception.Message)" 'ERROR'
    Initialize-NebulaProgress -Status 'idle'
}
