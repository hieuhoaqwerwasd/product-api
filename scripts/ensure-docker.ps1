$ErrorActionPreference = 'Stop'

function Test-DockerReady {
    try {
        $null = & docker info --format '{{.ServerVersion}}' 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

if (Test-DockerReady) {
    Write-Host 'Docker Engine is ready.'
    exit 0
}

$dockerCommand = (Get-Command docker -ErrorAction Stop).Source
$installRoot = Split-Path (Split-Path (Split-Path $dockerCommand -Parent) -Parent) -Parent
$candidates = @(
    (Join-Path $installRoot 'Docker Desktop.exe'),
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe')
)
$desktop = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $desktop) {
    throw 'Docker Desktop was not found. Start Docker Engine before deploying.'
}

Write-Host 'Starting Docker Desktop; waiting up to 180 seconds for Docker Engine...'
Start-Process -FilePath $desktop -WindowStyle Hidden
$deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $deadline) {
    if (Test-DockerReady) {
        Write-Host 'Docker Engine is ready.'
        exit 0
    }
    Start-Sleep -Seconds 5
}
throw 'Docker Engine did not become ready within 180 seconds. Check Docker Desktop/WSL.'
