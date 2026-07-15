use std::fs;
use std::path::{Path, PathBuf};

use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use tokio::process::Command as TokioCommand;
use tokio::sync::oneshot;
use tokio::time::{timeout, Duration};

use tauri::{Emitter, Manager, State};

use super::binaries;

const MAX_INPUT_DIMENSION: u32 = 2048;

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
    optimize_size: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "stage")]
pub enum AiBackgroundProgress {
    Starting,
    DownloadingModel,
    Processing,
    Saving,
    Done,
}

pub struct AiBackgroundCancelToken {
    pub sender: Option<oneshot::Sender<()>>,
}

impl AiBackgroundCancelToken {
    pub fn cancel(&mut self) {
        if let Some(sender) = self.sender.take() {
            let _ = sender.send(());
        }
    }
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

fn temporary_resized_path(input_path: &str) -> PathBuf {
    let input = Path::new(input_path);
    let parent = input.parent().unwrap_or(Path::new("."));
    let stem = input
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("input");
    parent.join(format!("{stem}-managerlocal-resized.png"))
}

fn resize_image_if_needed(input_path: &str, optimize: bool) -> Result<(String, Option<PathBuf>), String> {
    if !optimize {
        return Ok((input_path.into(), None));
    }

    let img = image::open(input_path)
        .map_err(|error| format!("No se pudo leer la imagen para optimizar: {error}"))?;
    let (width, height) = (img.width(), img.height());
    if width <= MAX_INPUT_DIMENSION && height <= MAX_INPUT_DIMENSION {
        return Ok((input_path.into(), None));
    }

    let scale = MAX_INPUT_DIMENSION as f32 / width.max(height) as f32;
    let new_width = (width as f32 * scale).max(1.0) as u32;
    let new_height = (height as f32 * scale).max(1.0) as u32;

    let resized = img.resize(new_width, new_height, FilterType::Triangle);
    let temp_path = temporary_resized_path(input_path);
    resized
        .save_with_format(&temp_path, image::ImageFormat::Png)
        .map_err(|error| format!("No se pudo guardar la imagen optimizada: {error}"))?;
    Ok((temp_path.to_string_lossy().into_owned(), Some(temp_path)))
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
pub fn cancel_remove_background_ai(state: State<'_, std::sync::Mutex<AiBackgroundCancelToken>>) {
    if let Ok(mut token) = state.lock() {
        token.cancel();
    }
}

#[tauri::command]
pub async fn remove_background_ai(
    input: AiBackgroundInput,
    app: tauri::AppHandle,
) -> Result<String, String> {
    validate_paths(&input.input_path, &input.output_path)?;
    let model = validate_model(&input.model)?;
    let executable = rembg_executable()
        .ok_or("Falta rembg. Instálalo o empaquétalo como sidecar para usar IA local.")?;

    fs::create_dir_all(rembg_models_directory())
        .map_err(|error| format!("No se pudo preparar la carpeta de modelos: {error}"))?;

    let window = app.get_webview_window("main")
        .ok_or("No se encontró la ventana principal")?;

    let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
    {
        let state = app.state::<std::sync::Mutex<AiBackgroundCancelToken>>();
        if let Ok(mut token) = state.lock() {
            token.sender = Some(cancel_tx);
        };
    }

    let _ = window.emit("rembg-progress", AiBackgroundProgress::Starting);

    let input_path = input.input_path.clone();
    let optimize = input.optimize_size;
    let (effective_input, temp_path) = tokio::task::spawn_blocking(move || {
        resize_image_if_needed(&input_path, optimize)
    })
    .await
    .map_err(|error| format!("Error al preparar la imagen: {error}"))??;

    let _ = window.emit("rembg-progress", AiBackgroundProgress::DownloadingModel);

    let mut std_command = std::process::Command::new(&executable);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std_command.creation_flags(0x08000000);
    }
    std_command.env("U2NET_HOME", rembg_models_directory());
    let mut command = TokioCommand::from(std_command);
    command.arg("i");
    if input.alpha_matting {
        command.arg("-a");
    }
    if let Some(model) = model {
        command.args(["-m", model]);
    }
    command.arg(&effective_input).arg(&input.output_path);

    let child = command
        .kill_on_drop(true)
        .spawn()
        .map_err(|error| format!("No se pudo ejecutar rembg: {error}"))?;

    let _ = window.emit("rembg-progress", AiBackgroundProgress::Processing);

    let result = tokio::select! {
        biased;
        _ = &mut cancel_rx => {
            let _ = window.emit("rembg-progress", AiBackgroundProgress::Done);
            if let Some(temp) = temp_path {
                let _ = fs::remove_file(temp);
            }
            return Err("Proceso cancelado".into());
        }
        output = timeout(Duration::from_secs(600), child.wait_with_output()) => {
            match output {
                Ok(Ok(output)) => output,
                Ok(Err(error)) => {
                    let _ = window.emit("rembg-progress", AiBackgroundProgress::Done);
                    if let Some(temp) = temp_path {
                        let _ = fs::remove_file(temp);
                    }
                    return Err(format!("No se pudo ejecutar rembg: {error}"));
                }
                Err(_) => {
                    let _ = window.emit("rembg-progress", AiBackgroundProgress::Done);
                    if let Some(temp) = temp_path {
                        let _ = fs::remove_file(temp);
                    }
                    return Err("rembg excedió el tiempo máximo de 10 minutos".into());
                }
            }
        }
    };

    let _ = window.emit("rembg-progress", AiBackgroundProgress::Saving);

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr).trim().to_string();
        let _ = window.emit("rembg-progress", AiBackgroundProgress::Done);
        if let Some(temp) = temp_path {
            let _ = fs::remove_file(temp);
        }
        return Err(if stderr.is_empty() {
            "rembg no pudo quitar el fondo".into()
        } else {
            stderr
        });
    }
    if !Path::new(&input.output_path).is_file() {
        let _ = window.emit("rembg-progress", AiBackgroundProgress::Done);
        if let Some(temp) = temp_path {
            let _ = fs::remove_file(temp);
        }
        return Err("rembg terminó sin crear el archivo de salida".into());
    }

    if let Some(temp) = temp_path {
        let _ = fs::remove_file(temp);
    }

    let _ = window.emit("rembg-progress", AiBackgroundProgress::Done);
    Ok(input.output_path)
}
