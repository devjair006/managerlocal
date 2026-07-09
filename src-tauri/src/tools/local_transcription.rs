use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModelInfo {
    name: String,
    path: String,
    size_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionRuntime {
    whisper: bool,
    executable: Option<String>,
    bundled_models: Vec<WhisperModelInfo>,
    models_directory: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionInput {
    audio_path: String,
    model_path: String,
    language: String,
    translate: bool,
}

const CANDIDATES: &[&str] = if cfg!(target_os = "windows") {
    &[
        "whisper-cli.exe",
        "whisper-cli",
        "main.exe",
        "whisper.exe",
        "whisper",
    ]
} else {
    &["whisper-cli", "main", "whisper"]
};

fn whisper_executable() -> Option<String> {
    binaries::probe(CANDIDATES, &["--help"]).1
}

fn bundled_models_directory() -> Option<PathBuf> {
    binaries::data_directory("models").or_else(|| binaries::data_directory("whisper-models"))
}

fn bundled_models() -> Vec<WhisperModelInfo> {
    let Some(directory) = bundled_models_directory() else {
        return Vec::new();
    };

    let mut models = fs::read_dir(directory)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if !path.is_file() || path.extension()?.to_string_lossy().to_lowercase() != "bin" {
                return None;
            }
            let metadata = fs::metadata(&path).ok()?;
            Some(WhisperModelInfo {
                name: path.file_name()?.to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                size_bytes: metadata.len(),
            })
        })
        .collect::<Vec<_>>();

    models.sort_by(|a, b| a.name.cmp(&b.name));
    models
}

fn resolve_model_path(input_model_path: &str) -> Result<String, String> {
    if !input_model_path.trim().is_empty() {
        return Ok(input_model_path.to_string());
    }

    bundled_models()
        .into_iter()
        .next()
        .map(|model| model.path)
        .ok_or("Selecciona un modelo Whisper .bin o empaqueta uno en binaries/models.".into())
}

fn whisper_accepts_input(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "wav" | "mp3" | "flac" | "ogg"
            )
        })
        .unwrap_or(false)
}

fn temporary_wav_path() -> PathBuf {
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    std::env::temp_dir().join(format!("managerlocal-transcription-{nonce}.wav"))
}

fn prepare_audio_for_whisper(audio_path: &str) -> Result<(String, Option<PathBuf>), String> {
    if whisper_accepts_input(audio_path) {
        return Ok((audio_path.to_string(), None));
    }

    let temporary_wav = temporary_wav_path();
    let output = binaries::candidate_command(&["ffmpeg"])
        .args([
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            audio_path,
            "-vn",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
        ])
        .arg(&temporary_wav)
        .output()
        .map_err(|_| "Para transcribir este formato hace falta FFmpeg local".to_string())?;

    if !output.status.success() || !temporary_wav.is_file() {
        let _ = fs::remove_file(&temporary_wav);
        let details = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if details.is_empty() {
            "FFmpeg no pudo preparar el audio para Whisper".into()
        } else {
            details
        });
    }

    Ok((
        temporary_wav.to_string_lossy().into_owned(),
        Some(temporary_wav),
    ))
}

fn validate(audio_path: &str, model_path: &str, language: &str) -> Result<(), String> {
    if audio_path.trim().is_empty() {
        return Err("Selecciona un audio o video de entrada".into());
    }
    if !Path::new(audio_path).is_file() {
        return Err("El archivo de audio o video no existe".into());
    }
    if !Path::new(model_path).is_file() || !model_path.to_lowercase().ends_with(".bin") {
        return Err("El modelo debe ser un archivo .bin válido".into());
    }
    let allowed_languages = ["es", "en", "auto"];
    if !allowed_languages.contains(&language) {
        return Err("Idioma no compatible".into());
    }
    Ok(())
}

#[tauri::command]
pub fn transcription_runtime() -> TranscriptionRuntime {
    let executable = whisper_executable();
    let models_directory =
        bundled_models_directory().map(|path| path.to_string_lossy().into_owned());
    TranscriptionRuntime {
        whisper: executable.is_some(),
        executable,
        bundled_models: bundled_models(),
        models_directory,
    }
}

#[tauri::command]
pub fn transcribe_local_audio(input: TranscriptionInput) -> Result<String, String> {
    let model_path = resolve_model_path(&input.model_path)?;
    validate(&input.audio_path, &model_path, &input.language)?;
    let executable = whisper_executable().ok_or(
        "Falta Whisper/whisper.cpp. Agrega el ejecutable al PATH o empaquétalo como sidecar.",
    )?;

    let (audio_for_whisper, temporary_audio) = prepare_audio_for_whisper(&input.audio_path)?;
    let temp_output =
        std::env::temp_dir().join(format!("managerlocal-transcription-{}", std::process::id()));
    let temp_txt = temp_output.with_extension("txt");
    let _ = fs::remove_file(&temp_txt);

    let mut command = binaries::command(&executable);
    command
        .args(["-m", &model_path])
        .args(["-f", &audio_for_whisper])
        .arg("-otxt")
        .arg("-of")
        .arg(&temp_output);

    if input.language != "auto" {
        command.args(["-l", &input.language]);
    }
    if input.translate {
        command.arg("-tr");
    }

    let output = command
        .output()
        .map_err(|error| format!("No se pudo ejecutar Whisper: {error}"));
    if let Some(path) = temporary_audio {
        let _ = fs::remove_file(path);
    }

    let output = output?;
    if !output.status.success() {
        let _ = fs::remove_file(&temp_txt);
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Whisper no pudo transcribir el archivo".into()
        } else {
            stderr
        });
    }

    let text = fs::read_to_string(&temp_txt)
        .map_err(|error| format!("No se pudo leer la transcripción: {error}"))?;
    let _ = fs::remove_file(&temp_txt);
    Ok(text.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::whisper_accepts_input;

    #[test]
    fn identifies_formats_whisper_can_read_without_conversion() {
        assert!(whisper_accepts_input("audio.WAV"));
        assert!(whisper_accepts_input("audio.mp3"));
        assert!(!whisper_accepts_input("video.mp4"));
        assert!(!whisper_accepts_input("audio.m4a"));
    }
}
