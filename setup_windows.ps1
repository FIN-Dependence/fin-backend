$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $projectRoot ".venv"

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw "Python Launcher(py)가 없습니다. Python 3.11을 먼저 설치하세요."
}

if (-not (Test-Path $venvPath)) {
    py -3.11 -m venv $venvPath
}

$pythonPath = Join-Path $venvPath "Scripts\python.exe"
& $pythonPath -m pip install --upgrade pip
& $pythonPath -m pip install -r (Join-Path $projectRoot "requirements-data.txt")
& $pythonPath -m ipykernel install --user --name finindependence --display-name "FINDEPENDENCE"

Write-Host "환경 구성이 완료되었습니다."
Write-Host "VS Code에서 Jupyter 커널 'FINDEPENDENCE'를 선택하세요."

