param(
  [string]$Destination = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $Destination) {
  if ($env:LOCALAPPDATA) {
    $Destination = Join-Path $env:LOCALAPPDATA "Manager Local\binaries"
  } else {
    $Destination = "src-tauri\binaries"
  }
}

if ([System.IO.Path]::IsPathRooted($Destination)) {
  $target = $Destination
} else {
  $target = Join-Path $root $Destination
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

$assetName = if ([Environment]::Is64BitOperatingSystem) { "whisper-bin-x64.zip" } else { "whisper-bin-Win32.zip" }
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest" -Headers @{ "User-Agent" = "ManagerLocal" }
$asset = $release.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
if (-not $asset) {
  throw "La versión $($release.tag_name) de whisper.cpp no publica el archivo $assetName."
}

$enginePath = Join-Path $target "whisper-cli.exe"
if ((Test-Path -LiteralPath $enginePath) -and -not $Force) {
  Write-Host "EXISTS   $enginePath (usa -Force para sustituirlo)" -ForegroundColor Yellow
  exit 0
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "managerlocal-whisper-$([guid]::NewGuid().ToString('N'))"
$archivePath = Join-Path $temporaryRoot $assetName
$extractPath = Join-Path $temporaryRoot "extract"
New-Item -ItemType Directory -Force -Path $extractPath | Out-Null

try {
  Write-Host "DOWNLOAD $($asset.browser_download_url)" -ForegroundColor Cyan
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archivePath
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force

  $sourceExecutable = Get-ChildItem -LiteralPath $extractPath -Recurse -File |
    Where-Object { $_.Name -in @("whisper-cli.exe", "main.exe") } |
    Select-Object -First 1
  if (-not $sourceExecutable) {
    throw "El paquete descargado no contiene whisper-cli.exe ni main.exe."
  }

  $sourceDirectory = $sourceExecutable.Directory
  Get-ChildItem -LiteralPath $sourceDirectory.FullName -File | ForEach-Object {
    $destinationName = if ($_.Name -eq "main.exe") { "whisper-cli.exe" } else { $_.Name }
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $target $destinationName) -Force
  }

  Write-Host "OK       whisper.cpp $($release.tag_name) instalado en: $target" -ForegroundColor Green
  Write-Host "NOTA     Descarga un modelo con scripts\download-whisper-model.ps1 y colócalo en $target\models" -ForegroundColor DarkYellow
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
