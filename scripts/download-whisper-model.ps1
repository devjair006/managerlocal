param(
  [ValidateSet("tiny", "tiny.en", "base", "base.en", "small", "small.en")]
  [string]$Model = "base",
  [string]$Destination = ""
)

$ErrorActionPreference = "Stop"

$knownSha1 = @{
  "tiny" = "bd577a113a864445d4c299885e0cb97d4ba92b5f"
  "tiny.en" = "c78c86eb1a8faa21b369bcd33207cc90d64ae9df"
  "base" = "465707469ff3a37a2b9b8d8f89f2f99de7299dac"
  "base.en" = "137c40403d78fd54d454da0f9bd998f78703390c"
  "small" = "55356645c2b361a969dfd0ef2c5a50d530afd8d5"
  "small.en" = "db8a495a91d927739e50b3fc1cc4c6b8f6c2d022"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $Destination) {
  if ($env:LOCALAPPDATA) {
    $Destination = Join-Path $env:LOCALAPPDATA "Manager Local\binaries\models"
  } else {
    $Destination = "src-tauri\binaries\models"
  }
}

if ([System.IO.Path]::IsPathRooted($Destination)) {
  $target = $Destination
} else {
  $target = Join-Path $root $Destination
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

$fileName = "ggml-$Model.bin"
$outputPath = Join-Path $target $fileName
$url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$fileName"

if (Test-Path -LiteralPath $outputPath) {
  $existingSha1 = (Get-FileHash -Algorithm SHA1 -LiteralPath $outputPath).Hash.ToLowerInvariant()
  if ($existingSha1 -eq $knownSha1[$Model]) {
    Write-Host "EXISTS   $outputPath (verificado)"
    exit 0
  }
  Write-Host "REPLACE  El archivo existente no superó la verificación" -ForegroundColor Yellow
  Remove-Item -LiteralPath $outputPath -Force
}

$temporaryPath = "$outputPath.partial"
if (Test-Path -LiteralPath $temporaryPath) {
  Remove-Item -LiteralPath $temporaryPath -Force
}

Write-Host "DOWNLOAD $url"
Invoke-WebRequest -Uri $url -OutFile $temporaryPath

$actualSha1 = (Get-FileHash -Algorithm SHA1 -LiteralPath $temporaryPath).Hash.ToLowerInvariant()
$expectedSha1 = $knownSha1[$Model]

if ($actualSha1 -ne $expectedSha1) {
  Remove-Item -LiteralPath $temporaryPath -Force
  throw "SHA1 inválido para $fileName. Esperado $expectedSha1, recibido $actualSha1. Archivo eliminado."
}

Move-Item -LiteralPath $temporaryPath -Destination $outputPath
Write-Host "OK       $fileName verificado"
Write-Host "Modelo disponible en: $outputPath"
