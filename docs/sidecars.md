# Sidecars y dependencias locales

Manager Local debe funcionar como app real, sin pedirle al usuario que instale diez herramientas manualmente.

La app busca binarios en este orden:

1. Variable `MANAGERLOCAL_BIN_DIR`.
2. Carpeta de recursos del usuario.
3. Carpeta `binaries` junto al ejecutable empaquetado.
4. Carpeta de recursos empaquetados `resources/binaries`.
5. Carpeta de desarrollo `src-tauri/binaries`.
6. `PATH` del sistema.

En Windows, la carpeta escribible del usuario es:

```text
%LOCALAPPDATA%\Manager Local\binaries
```

Esa carpeta es la mejor para modelos descargados por el usuario o recursos agregados después de instalar la app.

Durante desarrollo puedes poner binarios en:

```text
src-tauri/binaries/
```

Ejemplos:

```text
src-tauri/binaries/ffmpeg.exe
src-tauri/binaries/ffprobe.exe
src-tauri/binaries/pdftoppm.exe
src-tauri/binaries/tesseract.exe
src-tauri/binaries/gswin64c.exe
src-tauri/binaries/mutool.exe
src-tauri/binaries/yt-dlp.exe
src-tauri/binaries/whisper-cli.exe
src-tauri/binaries/rembg.exe
```

Puedes copiar automáticamente los ejecutables encontrados en tu `PATH` con:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-sidecars.ps1
```

El script también busca instalaciones típicas aunque no estén en `PATH` (por ejemplo Ghostscript en `C:\Program Files\gs\` y Tesseract en `Program Files`).

## Ghostscript (PDF avanzado)

Ghostscript **no está en winget**. Instalarlo no basta: el instalador casi nunca deja `gswin64c` en el `PATH`, y la app no lo busca en `Program Files` directamente.

### Pasos

1. Descarga **AGPL** o **GPL** → Windows 64-bit desde [ghostscript.com/releases/gsdnld.html](https://ghostscript.com/releases/gsdnld.html).
2. Instala con las opciones por defecto (queda en `C:\Program Files\gs\gs10.xx.x\bin\`).
3. Desde la carpeta del proyecto, copia el sidecar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-sidecars.ps1
```

Deberías ver: `COPIED ghostscript -> gswin64c.exe (desde C:\Program Files\gs\...)`.

4. Reinicia la app (`npm run tauri dev`) y refresca el Centro de dependencias.

### Si sigue en FALTA

Copia manual a las carpetas que usa el desarrollo:

```powershell
$gs = Get-ChildItem "C:\Program Files\gs" -Recurse -Filter gswin64c.exe | Select-Object -First 1
Copy-Item $gs.FullName "src-tauri\binaries\gswin64c.exe" -Force
Copy-Item $gs.FullName "src-tauri\target\debug\binaries\gswin64c.exe" -Force
```

### ¿Es obligatorio?

No. Si ya tienes **mutool**, puedes optimizar PDF sin Ghostscript. Ghostscript añade perfiles de compresión más finos en **Optimizar PDF avanzado**.

## Modelos Whisper

La transcripción local detecta modelos `.bin` en:

```text
%LOCALAPPDATA%\Manager Local\binaries\models
src-tauri/binaries/models/
```

Para descargar un modelo multilingüe base:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\download-whisper-model.ps1 -Model base
```

Modelos permitidos por el script:

- `tiny`
- `tiny.en`
- `base`
- `base.en`
- `small`
- `small.en`

El script verifica SHA1 y elimina el archivo si la descarga no coincide.

Por defecto ambos scripts instalan recursos en `%LOCALAPPDATA%\Manager Local\binaries`, que es la ubicación que la aplicación instalada detecta. Para incluirlos en un instalador de desarrollo, indica explícitamente `-Destination src-tauri\binaries` (y `src-tauri\binaries\models` para el modelo).

Para instalar el motor oficial de whisper.cpp en la carpeta de recursos del usuario:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\download-whisper-engine.ps1
```

El script consulta la última versión publicada, descarga el binario adecuado para Windows y conserva las DLL necesarias junto a `whisper-cli.exe`. Para dejarlo dentro del instalador durante desarrollo, usa `-Destination src-tauri\binaries`.

## Fondo con IA local (rembg)

El quitafondos IA usa rembg con CPU por defecto y conserva tanto el entorno como sus modelos dentro de la carpeta privada de Manager Local. No modifica paquetes Python globales.

Si ya tienes Python 3.11, 3.12 o 3.13 con pip:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-rembg.ps1
```

Para que el script instale Python 3.12 para tu usuario si no existe una versión compatible:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-rembg.ps1 -InstallPython
```

La primera eliminación descarga el modelo seleccionado una sola vez y lo guarda en `%LOCALAPPDATA%\Manager Local\binaries\rembg-models`.

## Empaquetar

Después de preparar sidecars y modelos:

```powershell
npm run build
npm run tauri build
```

Antes de distribuir hay que revisar licencias de cada dependencia y decidir si se empaqueta o si se deja como instalación externa. FFmpeg, Tesseract, Poppler, MuPDF, yt-dlp, whisper.cpp/modelos y rembg tienen licencias y condiciones distintas.
