param(
  [string]$Destination = "src-tauri\binaries"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = Join-Path $root $Destination
New-Item -ItemType Directory -Force -Path $target | Out-Null

$tools = @(
  @{ Name = "ffmpeg"; Command = "ffmpeg"; RequiredFiles = @("ffmpeg.exe") },
  @{ Name = "ffprobe"; Command = "ffprobe"; RequiredFiles = @("ffprobe.exe") },
  @{ Name = "pdftoppm"; Command = "pdftoppm"; RequiredFiles = @("pdftoppm.exe", "pdftoppm.cmd") },
  @{ Name = "ghostscript"; Command = "gswin64c"; RequiredFiles = @("gswin64c.exe", "gswin32c.exe", "gs.exe") },
  @{ Name = "mutool"; Command = "mutool"; RequiredFiles = @("mutool.exe") },
  @{ Name = "yt-dlp"; Command = "yt-dlp"; RequiredFiles = @("yt-dlp.exe") },
  @{ Name = "whisper"; Command = "whisper-cli"; RequiredFiles = @("whisper-cli.exe", "main.exe", "whisper.exe") },
  @{ Name = "rembg"; Command = "rembg"; RequiredFiles = @("rembg.exe", "rembg.cmd") }
)

function Copy-IfFound {
  param(
    [string]$ToolName,
    [string]$CommandName,
    [string[]]$RequiredFiles
  )

  $commandInfo = Get-Command $CommandName -ErrorAction SilentlyContinue
  if (-not $commandInfo) {
    Write-Host "MISSING  $ToolName ($CommandName no encontrado en PATH)" -ForegroundColor Yellow
    return
  }

  $source = $commandInfo.Source
  $sourceDirectory = Split-Path -Parent $source
  $copied = @()

  foreach ($file in $RequiredFiles) {
    $candidate = Join-Path $sourceDirectory $file
    if (Test-Path $candidate) {
      Copy-Item -LiteralPath $candidate -Destination (Join-Path $target $file) -Force
      $copied += $file
    }
  }

  if ($copied.Count -eq 0) {
    $fileName = Split-Path -Leaf $source
    Copy-Item -LiteralPath $source -Destination (Join-Path $target $fileName) -Force
    $copied += $fileName
  }

  Write-Host "COPIED   $ToolName -> $($copied -join ', ')" -ForegroundColor Green

  if ($ToolName -in @("pdftoppm", "tesseract", "ghostscript")) {
    Write-Host "WARN     $ToolName puede requerir DLLs/datos adicionales junto al ejecutable." -ForegroundColor DarkYellow
  }

  if ($ToolName -eq "pdftoppm") {
    Get-ChildItem $sourceDirectory -Filter *.dll -File -ErrorAction SilentlyContinue | Copy-Item -Destination $target -Force
    $parentBin = Split-Path -Parent $sourceDirectory
    Get-ChildItem $parentBin -Filter *.dll -File -ErrorAction SilentlyContinue | Copy-Item -Destination $target -Force
  }
}

foreach ($tool in $tools) {
  Copy-IfFound -ToolName $tool.Name -CommandName $tool.Command -RequiredFiles $tool.RequiredFiles
}

$tesseractRoots = @(@(
  "C:\Program Files\Tesseract-OCR",
  "C:\Program Files (x86)\Tesseract-OCR"
) | Where-Object { Test-Path (Join-Path $_ "tesseract.exe") })

if ($tesseractRoots.Count -gt 0) {
  $tesseractRoot = $tesseractRoots[0]
  Copy-Item -LiteralPath (Join-Path $tesseractRoot "tesseract.exe") -Destination (Join-Path $target "tesseract.exe") -Force
  Get-ChildItem $tesseractRoot -Filter *.dll -File | Copy-Item -Destination $target -Force
  $tessdataTarget = Join-Path $target "tessdata"
  New-Item -ItemType Directory -Force -Path $tessdataTarget | Out-Null
  foreach ($lang in @("eng", "osd", "spa")) {
    $sourceLang = Join-Path $tesseractRoot "tessdata\$lang.traineddata"
    if (Test-Path $sourceLang) {
      Copy-Item -LiteralPath $sourceLang -Destination (Join-Path $tessdataTarget "$lang.traineddata") -Force
    } elseif (Test-Path (Join-Path $tessdataTarget "$lang.traineddata")) {
      Write-Host "KEEP     tessdata $lang.traineddata ya existe en sidecars" -ForegroundColor DarkGreen
    } else {
      Write-Host "MISSING  tessdata $lang.traineddata" -ForegroundColor Yellow
    }
  }
  Write-Host "COPIED   tesseract -> tesseract.exe, DLLs, tessdata disponible" -ForegroundColor Green
} else {
  Write-Host "MISSING  tesseract (no encontrado en rutas típicas)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Sidecars preparados en: $target"
Write-Host "Ejecuta: npm run tauri build"
