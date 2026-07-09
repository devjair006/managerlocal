param(
  [string]$Python = "",
  [switch]$InstallPython,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Test-Python {
  param([string]$Candidate)
  if (-not $Candidate -or -not (Test-Path -LiteralPath $Candidate)) { return $false }
  try {
    $version = (& $Candidate -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or $version -notmatch '^3\.(11|12|13)$') { return $false }
    & $Candidate -m ensurepip --version *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Find-Python {
  param([string]$Requested)

  if ($Requested -and (Test-Python $Requested)) { return $Requested }

  $candidates = @()
  if ($env:LOCALAPPDATA) {
    $candidates += Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Programs\Python") -Filter python.exe -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object FullName
  }
  $candidates += @(
    "C:\Program Files\Python313\python.exe",
    "C:\Program Files\Python312\python.exe",
    "C:\Program Files\Python311\python.exe"
  )
  $command = Get-Command python -ErrorAction SilentlyContinue
  if ($command) { $candidates += $command.Source }

  foreach ($candidate in $candidates | Select-Object -Unique) {
    if (Test-Python $candidate) { return $candidate }
  }
  return $null
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$binaries = if ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA "Manager Local\binaries"
} else {
  Join-Path $root "src-tauri\binaries"
}
$venv = Join-Path $binaries "rembg-env"
$rembg = Join-Path $venv "Scripts\rembg.exe"

if ((Test-Path -LiteralPath $rembg) -and -not $Force) {
  & $rembg --help *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "EXISTS   rembg ya está disponible en $rembg" -ForegroundColor Green
    exit 0
  }
}

$pythonExecutable = Find-Python $Python
if (-not $pythonExecutable -and $InstallPython) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { throw "No se encontró Python compatible ni winget. Instala Python 3.12 desde python.org y vuelve a ejecutar el script." }
  Write-Host "INSTALL  Python 3.12 para la instalación local de rembg" -ForegroundColor Cyan
  & winget install --id Python.Python.3.12 --exact --scope user --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget no pudo instalar Python 3.12." }
  $pythonExecutable = Find-Python $Python
}

if (-not $pythonExecutable) {
  throw "Se necesita Python 3.11, 3.12 o 3.13 con pip. Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\install-rembg.ps1 -InstallPython"
}

New-Item -ItemType Directory -Force -Path $binaries | Out-Null
if ((Test-Path -LiteralPath $venv) -and $Force) {
  Remove-Item -LiteralPath $venv -Recurse -Force
}
if (-not (Test-Path -LiteralPath $venv)) {
  Write-Host "CREATE   Entorno aislado: $venv" -ForegroundColor Cyan
  & $pythonExecutable -m venv $venv
  if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el entorno aislado de rembg." }
}

$venvPython = Join-Path $venv "Scripts\python.exe"
Write-Host "INSTALL  rembg CPU + CLI (puede tardar unos minutos)" -ForegroundColor Cyan
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "No se pudo actualizar pip en el entorno de rembg." }
& $venvPython -m pip install "rembg[cpu,cli]"
if ($LASTEXITCODE -ne 0) { throw "No se pudo instalar rembg con soporte CPU." }

& $rembg --help *> $null
if ($LASTEXITCODE -ne 0) { throw "rembg se instaló, pero no pudo iniciarse." }

Write-Host "OK       rembg instalado de forma aislada" -ForegroundColor Green
Write-Host "MODELOS  Se descargarán localmente al usarlo por primera vez en: $(Join-Path $binaries 'rembg-models')" -ForegroundColor DarkYellow
