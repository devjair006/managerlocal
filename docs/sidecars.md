# Sidecars y dependencias locales

Manager Local debe funcionar como app real, sin pedirle al usuario que instale diez herramientas manualmente.

La app ya busca binarios en este orden:

1. Variable `MANAGERLOCAL_BIN_DIR`.
2. Carpeta `binaries` junto al ejecutable empaquetado.
3. Carpeta de recursos empaquetados `resources/binaries`.
4. Carpeta de desarrollo `src-tauri/binaries`.
5. `PATH` del sistema.

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
src-tauri/binaries/yt-dlp.exe
src-tauri/binaries/whisper-cli.exe
src-tauri/binaries/rembg.exe
```

Antes de distribuir hay que revisar licencias de cada dependencia y decidir si se empaqueta o si se deja como instalación externa.
