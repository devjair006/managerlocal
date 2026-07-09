use serde::Serialize;

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    id: String,
    name: String,
    available: bool,
    executable: Option<String>,
    version: Option<String>,
    used_by: Vec<String>,
    install_hint: String,
    packaging_hint: String,
    required_for: String,
}

fn dependency(
    id: &str,
    name: &str,
    candidates: &[&str],
    version_args: &[&str],
    used_by: &[&str],
    install_hint: &str,
    packaging_hint: &str,
    required_for: &str,
) -> DependencyStatus {
    let (available, executable, version) = binaries::probe(candidates, version_args);
    DependencyStatus {
        id: id.into(),
        name: name.into(),
        available,
        executable,
        version,
        used_by: used_by.iter().map(|value| (*value).into()).collect(),
        install_hint: install_hint.into(),
        packaging_hint: packaging_hint.into(),
        required_for: required_for.into(),
    }
}

#[tauri::command]
pub fn dependency_center_status() -> Vec<DependencyStatus> {
    vec![
        dependency(
            "ffmpeg",
            "FFmpeg",
            &["ffmpeg"],
            &["-version"],
            &["Convertir multimedia", "Descarga permitida"],
            "winget install Gyan.FFmpeg",
            "Empaquetar ffmpeg y ffprobe como sidecars.",
            "Convertir audio/video y generar MP4/MP3 desde descargas.",
        ),
        dependency(
            "ffprobe",
            "FFprobe",
            &["ffprobe"],
            &["-version"],
            &["Convertir multimedia"],
            "Se instala junto con FFmpeg.",
            "Empaquetar junto con FFmpeg.",
            "Validar duración y evitar archivos de video truncados.",
        ),
        dependency(
            "poppler",
            "Poppler / pdftoppm",
            &["pdftoppm"],
            &["-v"],
            &["PDF a imágenes", "OCR local para PDF"],
            "Instala Poppler y agrega la carpeta bin al PATH.",
            "Empaquetar pdftoppm y DLLs necesarias como recurso/sidecar.",
            "Renderizar páginas PDF como imágenes.",
        ),
        dependency(
            "tesseract",
            "Tesseract OCR",
            &["tesseract"],
            &["--version"],
            &["OCR local"],
            "winget install UB-Mannheim.TesseractOCR",
            "Empaquetar Tesseract y datos de idioma spa/eng respetando licencias.",
            "Extraer texto de capturas, imágenes y documentos escaneados.",
        ),
        dependency(
            "ghostscript",
            "Ghostscript",
            if cfg!(target_os = "windows") { &["gswin64c", "gswin32c", "gs"] } else { &["gs"] },
            &["--version"],
            &["Optimizar PDF avanzado"],
            "winget install ArtifexSoftware.Ghostscript",
            "Empaquetar binarios/licencias o pedir instalación externa según distribución.",
            "Recomprimir PDFs con perfiles de calidad/tamaño.",
        ),
        dependency(
            "whisper",
            "Whisper / whisper.cpp",
            if cfg!(target_os = "windows") { &["whisper-cli.exe", "whisper-cli", "main.exe", "whisper.exe", "whisper"] } else { &["whisper-cli", "main", "whisper"] },
            &["--help"],
            &["Transcripción local"],
            "Instala whisper.cpp y descarga un modelo ggml .bin compatible.",
            "Empaquetar whisper-cli como sidecar y gestionar modelos descargables.",
            "Transcribir audio/video sin subirlo a internet.",
        ),
        dependency(
            "yt-dlp",
            "yt-dlp",
            &["yt-dlp"],
            &["--version"],
            &["Descarga permitida"],
            "winget install yt-dlp.yt-dlp",
            "Empaquetar yt-dlp como sidecar y mantenerlo actualizable.",
            "Descargar medios donde tengas permiso y el sitio lo permita.",
        ),
        dependency(
            "rembg",
            "rembg",
            &["rembg"],
            &["--help"],
            &["Quitar fondo IA"],
            "pip install \"rembg[cli]\"",
            "Empaquetar runtime Python/modelos o migrar a ONNX Runtime integrado.",
            "Eliminar fondos complejos usando IA local.",
        ),
    ]
}
