Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $root 'NebulaClean.Core.ps1') -RootPath $root

$listener = [System.Net.HttpListener]::new()
$port = 5005
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)

Write-NebulaLog "Iniciando servidor NebulaClean em $prefix"

try {
    $listener.Start()
}
catch {
    Write-NebulaLog "Falha ao iniciar HttpListener: $($_.Exception.Message)" 'ERROR'
    Write-Host "Nao foi possivel iniciar o servidor HTTP. Verifique se a porta $port esta livre." -ForegroundColor Red
    exit 1
}

Initialize-NebulaConfig
Initialize-NebulaProgress

Start-Process $prefix | Out-Null

Write-Host "NebulaClean Enterprise em execucao em $prefix" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C nesta janela para encerrar." -ForegroundColor DarkGray

function Send-JsonResponse {
    param(
        [Parameter(Mandatory)] $Context,
        [Parameter(Mandatory)] $Data,
        [int]$StatusCode = 200
    )
    $response = $Context.Response
    $response.StatusCode = $StatusCode
    $json = $Data | ConvertTo-Json -Depth 8
    $buffer = [Text.Encoding]::UTF8.GetBytes($json)
    $response.ContentType = 'application/json; charset=utf-8'
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

function Send-FileResponse {
    param(
        [Parameter(Mandatory)] $Context,
        [Parameter(Mandatory)] [string]$FilePath,
        [string]$ContentType = 'text/plain'
    )
    $response = $Context.Response
    if (-not (Test-Path $FilePath)) {
        $response.StatusCode = 404
        $response.OutputStream.Close()
        return
    }
    $bytes = [IO.File]::ReadAllBytes($FilePath)
    $response.ContentType = $ContentType
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
}

function Get-RequestBodyJson {
    param(
        [Parameter(Mandatory)] $Context
    )
    $request = $Context.Request
    if (-not $request.HasEntityBody) {
        return $null
    }
    $bodyStream = New-Object IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $body = $bodyStream.ReadToEnd()
    $bodyStream.Close()
    if (-not $body) { return $null }
    return $body | ConvertFrom-Json
}

function Handle-ApiRequest {
    param(
        [Parameter(Mandatory)] $Context
    )

    $request = $Context.Request
    $path = $request.Url.AbsolutePath.ToLowerInvariant()

    switch -Wildcard ($path) {
        '/api/status' {
            $config = Get-NebulaConfig
            $disk = Get-NebulaDiskInfo
            $progress = Get-NebulaProgress
            $data = @{
                AppName    = 'NebulaClean Enterprise'
                Version    = '1.0.0'
                IsAdmin    = (Get-IsAdmin)
                Machine    = $env:COMPUTERNAME
                User       = $env:USERNAME
                Disk       = $disk
                Config     = $config
                Progress   = $progress
                Timestamp  = (Get-Date).ToString('o')
            }
            Send-JsonResponse -Context $Context -Data $data
        }
        '/api/start-clean' {
            $body = Get-RequestBodyJson -Context $Context
            $simulation = $true
            $selected = $null
            if ($body -and $body.Simulation -ne $null) {
                $simulation = [bool]$body.Simulation
            }
            if ($body -and $body.SelectedTargetIds) {
                $selected = @($body.SelectedTargetIds)
            }

            $current = Get-NebulaProgress
            if ($current.Status -eq 'running') {
                Send-JsonResponse -Context $Context -Data @{ error = 'Uma limpeza ja esta em andamento.' } -StatusCode 409
                return
            }

            Write-NebulaLog "Requisicao de limpeza recebida. Simulacao: $simulation"

            try {
                $worker = Join-Path $root 'NebulaClean.Worker.ps1'
                if (-not (Test-Path $worker)) {
                    throw "Worker nao encontrado: $worker"
                }

                $selectedCsv = ''
                if ($selected) {
                    $selectedCsv = (@($selected) -join ',')
                }

                $simFlag = if ($simulation) { '1' } else { '0' }
                Update-NebulaProgress -Status 'running' -Phase 'enumerating' -CurrentTarget 'Iniciando limpeza...' -Processed 0 -Total 0 -FreedBytes 0 -Simulation $simulation

                $args = "-NoProfile -ExecutionPolicy Bypass -File `"$worker`" -Root `"$root`" -SimulationFlag $simFlag -SelectedIdsCsv `"$selectedCsv`""
                $proc = Start-Process -FilePath 'powershell' -ArgumentList $args -WindowStyle Hidden -PassThru
                Write-NebulaLog "Worker de limpeza iniciado. PID: $($proc.Id)"

                $data = @{
                    Message        = 'Limpeza iniciada'
                    Simulation     = $simulation
                    WorkerPid      = $proc.Id
                }
                Send-JsonResponse -Context $Context -Data $data
            }
            catch {
                Write-NebulaLog "Erro ao iniciar limpeza: $($_.Exception.Message)" 'ERROR'
                Initialize-NebulaProgress -Status 'idle'
                Send-JsonResponse -Context $Context -Data @{ error = 'Erro ao iniciar limpeza. Veja os logs.' } -StatusCode 500
            }
        }
        '/api/progress' {
            try {
                $progress = Get-NebulaProgress
                Send-JsonResponse -Context $Context -Data $progress
            }
            catch {
                Write-NebulaLog "Falha ao ler progresso: $($_.Exception.Message)" 'WARN'
                Send-JsonResponse -Context $Context -Data @{
                    Status        = 'running'
                    Phase         = 'enumerating'
                    CurrentTarget = 'Atualizando progresso...'
                    Processed     = 0
                    Total         = 0
                    Percent       = 0
                    Simulation    = $true
                    FreedBytes    = 0
                    Timestamp     = (Get-Date).ToString('o')
                }
            }
        }
        '/api/logs' {
            $body = Get-RequestBodyJson -Context $Context
            $last = 200
            if ($body -and $body.Last) { $last = [int]$body.Last }
            $lines = Get-NebulaLogs -Last $last
            $data = @{
                Lines = $lines
            }
            Send-JsonResponse -Context $Context -Data $data
        }
        '/api/config' {
            if ($request.HttpMethod -eq 'GET') {
                $config = Get-NebulaConfig
                Send-JsonResponse -Context $Context -Data $config
            }
            elseif ($request.HttpMethod -eq 'POST') {
                $body = Get-RequestBodyJson -Context $Context
                if ($null -eq $body) {
                    Send-JsonResponse -Context $Context -Data @{ error = 'Corpo da requisicao vazio.' } -StatusCode 400
                    return
                }
                Save-NebulaConfig -Config $body
                if ($body.Schedule) {
                    Set-NebulaSchedule -Enabled:[bool]$body.Schedule.Enabled -Time $body.Schedule.Time
                }
                Send-JsonResponse -Context $Context -Data @{ message = 'Configuracao salva.' }
            }
            else {
                $Context.Response.StatusCode = 405
                $Context.Response.OutputStream.Close()
            }
        }
        Default {
            $Context.Response.StatusCode = 404
            $Context.Response.OutputStream.Close()
        }
    }
}

function Handle-StaticRequest {
    param(
        [Parameter(Mandatory)] $Context
    )

    $request = $Context.Request
    $path = $request.Url.AbsolutePath

    if ($path -eq '/' -or $path -eq '') {
        $file = Join-Path $root '..\ui\index.html'
        Send-FileResponse -Context $Context -FilePath $file -ContentType 'text/html; charset=utf-8'
        return
    }

    switch -Wildcard ($path.ToLowerInvariant()) {
        '/styles.css' {
            $file = Join-Path $root '..\ui\styles.css'
            Send-FileResponse -Context $Context -FilePath $file -ContentType 'text/css; charset=utf-8'
        }
        '/app.js' {
            $file = Join-Path $root '..\ui\app.js'
            Send-FileResponse -Context $Context -FilePath $file -ContentType 'application/javascript; charset=utf-8'
        }
        Default {
            $Context.Response.StatusCode = 404
            $Context.Response.OutputStream.Close()
        }
    }
}

while ($true) {
    try {
        $context = $listener.GetContext()
        $path = $context.Request.Url.AbsolutePath.ToLowerInvariant()

        if ($path.StartsWith('/api/')) {
            Handle-ApiRequest -Context $context
        }
        else {
            Handle-StaticRequest -Context $context
        }
    }
    catch [System.Net.HttpListenerException] {
        break
    }
    catch {
        Write-NebulaLog "Erro inesperado no servidor: $($_.Exception.Message)" 'ERROR'
    }
}

Write-NebulaLog 'Servidor NebulaClean encerrado.'
$listener.Stop()
