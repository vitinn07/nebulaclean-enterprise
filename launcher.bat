@echo off
setlocal enabledelayedexpansion

REM NebulaClean Enterprise - Launcher
REM Executa o engine PowerShell com UI web local

set "SCRIPT_DIR=%~dp0"
set "ENGINE=%SCRIPT_DIR%engine\NebulaClean.ps1"

if not exist "%ENGINE%" (
    echo [NebulaClean] Engine PowerShell nao encontrado em:
    echo    "%ENGINE%"
    echo Verifique se todos os arquivos foram extraidos corretamente.
    pause
    exit /b 1
)

REM Sugerir execucao como administrador (nao forca elevacao)
whoami /groups | find "S-1-16-12288" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [NebulaClean] Recomenda-se executar este launcher como Administrador
    echo para que todas as pastas de sistema possam ser limpas.
    echo.
)

REM Inicia o engine com politica de execucao flexivel
powershell -NoProfile -ExecutionPolicy Bypass -File "%ENGINE%"

echo.
echo [NebulaClean] Programa encerrado. Verifique mensagens acima em caso de erro.
pause
endlocal
