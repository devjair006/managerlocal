use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiBackgroundRuntime {
    pub rembg: bool,
    pub executable: Option<String>,
    pub models_directory: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiBackgroundInput {
    input_path: String,
    output_path: String,
    model: String,
    alpha_matting: bool,
}

fn rembg_models_directory() -> std::path::PathBuf {
    binaries::user_binaries_directory().join("rembg-models")
}

fn managed_rembg_executable() -> Option<String> {
    let executable = binaries::user_binaries_directory()
        .join("rembg-env")
        .join("Scripts")
        .join("rembg.exe");
    if !executable.is_file() {
        return None;
    }

    let output = binaries::command(executable.to_string_lossy().as_ref())
        .arg("--help")
        .output()
        .ok()?;
    if output.status.success() {
        Some(executable.to_string_lossy().into_owned())
    } else {
        None
    }
}

fn rembg_executable() -> Option<String> {
    managed_rembg_executable().or_else(|| binaries::probe(&["rembg"], &["--help"]).1)
}

fn validate_model(model: &str) -> Result<Option<&str>, String> {
    match model {
        "default" => Ok(None),
        "u2net" => Ok(Some("u2net")),
        "u2net_human_seg" => Ok(Some("u2net_human_seg")),
        "isnet-general-use" => Ok(Some("isnet-general-use")),
        "birefnet-general" => Ok(Some("birefnet-general")),
        _ => Err("Modelo de recorte IA no compatible".into()),
    }
}

fn validate_paths(input_path: &str, output_path: &str) -> Result<(), String> {
    if input_path.trim().is_empty() {
        return Err("Selecciona una imagen de entrada".into());
    }
    if output_path.trim().is_empty() {
        return Err("Selecciona una ruta de salida".into());
    }
    let lower = input_path.to_lowercase();
    let valid_input = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]
        .iter()
        .any(|extension| lower.ends_with(extension));
    if !valid_input || !Path::new(input_path).is_file() {
        return Err("La entrada debe ser una imagen válida".into());
    }
    if fs::metadata(input_path)
        .map_err(|error| error.to_string())?
        .len()
        > 50 * 1024 * 1024
    {
        return Err("La imagen no puede superar 50 MB".into());
    }
    if !output_path.to_lowercase().ends_with(".png") {
        return Err("La salida debe ser PNG para conservar transparencia".into());
    }
    let input = fs::canonicalize(input_path).map_err(|error| error.to_string())?;
    if let Ok(output) = fs::canonicalize(output_path) {
        if input == output {
            return Err("Guarda el resultado en un archivo distinto al original".into());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn ai_background_runtime() -> AiBackgroundRuntime {
    let executable = rembg_executable();
    AiBackgroundRuntime {
        rembg: executable.is_some(),
        executable,
        models_directory: rembg_models_directory().to_string_lossy().into_owned(),
    }
}

#[tauri::command]
pub fn remove_background_ai(input: AiBackgroundInput) -> Result<String, String> {
    validate_paths(&input.input_path, &input.output_path)?;
    let model = validate_model(&input.model)?;
    if rembg_executable().is_none() {
        return Err("Falta rembg. Instálalo o empaquétalo como sidecar para usar IA local.".into());
    }

    let executable = rembg_executable()
        .ok_or("Falta rembg. Instálalo o empaquétalo como sidecar para usar IA local.")?;
    fs::create_dir_all(rembg_models_directory())
        .map_err(|error| format!("No se pudo preparar la carpeta de modelos: {error}"))?;
    let mut command = binaries::command(&executable);
    command.env("U2NET_HOME", rembg_models_directory());
    command.arg("i");
    if input.alpha_matting {
        command.arg("-a");
    }
    if let Some(model) = model {
        command.args(["-m", model]);
    }
    let output = command
        .arg(&input.input_path)
        .arg(&input.output_path)
        .output()
        .map_err(|error| format!("No se pudo ejecutar rembg: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "rembg no pudo quitar el fondo".into()
        } else {
            stderr
        });
    }
    if !Path::new(&input.output_path).is_file() {
        return Err("rembg terminó sin crear el archivo de salida".into());
    }
    Ok(input.output_path)
}
