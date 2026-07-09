use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionRuntime {
    whisper: bool,
    executable: Option<String>,
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
    &["whisper-cli.exe", "whisper-cli", "main.exe", "whisper.exe", "whisper"]
} else {
    &["whisper-cli", "main", "whisper"]
};

fn whisper_executable() -> Option<String> {
    binaries::probe(CANDIDATES, &["--help"]).1
}

fn validate(input: &TranscriptionInput) -> Result<(), String> {
    if input.audio_path.trim().is_empty() {
        return Err("Selecciona un audio o video de entrada".into());
    }
    if input.model_path.trim().is_empty() {
        return Err("Selecciona un modelo Whisper .bin".into());
    }
    if !Path::new(&input.audio_path).is_file() {
        return Err("El archivo de audio o video no existe".into());
    }
    if !Path::new(&input.model_path).is_file() || !input.model_path.to_lowercase().ends_with(".bin") {
        return Err("El modelo debe ser un archivo .bin válido".into());
    }
    let allowed_languages = ["es", "en", "auto"];
    if !allowed_languages.contains(&input.language.as_str()) {
        return Err("Idioma no compatible".into());
    }
    Ok(())
}

#[tauri::command]
pub fn transcription_runtime() -> TranscriptionRuntime {
    let executable = whisper_executable();
    TranscriptionRuntime { whisper: executable.is_some(), executable }
}

#[tauri::command]
pub fn transcribe_local_audio(input: TranscriptionInput) -> Result<String, String> {
    validate(&input)?;
    let executable = whisper_executable().ok_or("Falta Whisper/whisper.cpp. Agrega el ejecutable al PATH o empaquétalo como sidecar.")?;

    let temp_output = std::env::temp_dir().join(format!("managerlocal-transcription-{}", std::process::id()));
    let temp_txt = temp_output.with_extension("txt");
    let _ = fs::remove_file(&temp_txt);

    let mut command = binaries::command(&executable);
    command
        .args(["-m", &input.model_path])
        .args(["-f", &input.audio_path])
        .arg("-otxt")
        .arg("-of")
        .arg(&temp_output);

    if input.language != "auto" {
        command.args(["-l", &input.language]);
    }
    if input.translate {
        command.arg("-tr");
    }

    let output = command.output().map_err(|error| format!("No se pudo ejecutar Whisper: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() { "Whisper no pudo transcribir el archivo".into() } else { stderr });
    }

    let text = fs::read_to_string(&temp_txt).map_err(|error| format!("No se pudo leer la transcripción: {error}"))?;
    let _ = fs::remove_file(&temp_txt);
    Ok(text.trim().to_string())
}
