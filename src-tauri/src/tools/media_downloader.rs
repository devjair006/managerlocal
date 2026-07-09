use std::path::Path;

use serde::{Deserialize, Serialize};

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDownloaderRuntime {
    yt_dlp: bool,
    ffmpeg: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDownloadInput {
    url: String,
    output_directory: String,
    mode: String,
    confirm_permitted: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDownloadResult {
    output_directory: String,
    mode: String,
    message: String,
}

fn yt_dlp_available() -> bool {
    binaries::probe(&["yt-dlp"], &["--version"]).0
}

fn ffmpeg_available() -> bool {
    binaries::probe(&["ffmpeg"], &["-version"]).0
}

fn validate_url(url: &str) -> Result<(), String> {
    let lower = url.trim().to_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) {
        return Err("Usa una URL http o https válida".into());
    }
    let internal_targets = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."];
    if internal_targets.iter().any(|target| lower.contains(target)) {
        return Err("No se permiten URLs locales o de redes privadas desde esta herramienta".into());
    }
    let blocked = ["netflix.", "disneyplus.", "hulu.", "primevideo.", "max.com", "spotify.", "apple.com/tv"];
    if blocked.iter().any(|domain| lower.contains(domain)) {
        return Err("Este sitio suele usar contenido protegido. No se permite desde esta herramienta.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn media_downloader_runtime() -> MediaDownloaderRuntime {
    MediaDownloaderRuntime { yt_dlp: yt_dlp_available(), ffmpeg: ffmpeg_available() }
}

#[tauri::command]
pub fn download_permitted_media(input: MediaDownloadInput) -> Result<MediaDownloadResult, String> {
    validate_url(&input.url)?;
    if !input.confirm_permitted {
        return Err("Confirma que tienes permiso para descargar o convertir este medio".into());
    }
    if !Path::new(&input.output_directory).is_dir() {
        return Err("Selecciona una carpeta de salida válida".into());
    }
    if !yt_dlp_available() {
        return Err("Falta yt-dlp. Instálalo o empaquétalo como sidecar para usar esta herramienta.".into());
    }

    let mut command = binaries::candidate_command(&["yt-dlp"]);
    command
        .arg("--no-playlist")
        .arg("--restrict-filenames")
        .arg("-P")
        .arg(&input.output_directory);

    match input.mode.as_str() {
        "best" => {
            command.args(["-f", "bv*+ba/b"]);
        }
        "mp4" => {
            if !ffmpeg_available() {
                return Err("Para convertir a MP4 necesitas FFmpeg disponible".into());
            }
            command.args(["-f", "bv*+ba/b", "--merge-output-format", "mp4"]);
        }
        "mp3" => {
            if !ffmpeg_available() {
                return Err("Para extraer MP3 necesitas FFmpeg disponible".into());
            }
            command.args(["-x", "--audio-format", "mp3", "--audio-quality", "0"]);
        }
        _ => return Err("Modo de descarga no compatible".into()),
    }

    let output = command.arg(&input.url).output().map_err(|error| format!("No se pudo ejecutar yt-dlp: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() { "yt-dlp no pudo descargar el medio".into() } else { stderr });
    }

    Ok(MediaDownloadResult {
        output_directory: input.output_directory,
        mode: input.mode,
        message: "Descarga finalizada. Revisa la carpeta seleccionada.".into(),
    })
}
