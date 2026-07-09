use std::fs;
use std::path::PathBuf;

use serde::Serialize;

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceFile {
    name: String,
    path: String,
    size_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceManagerStatus {
    binaries_directory: String,
    user_binaries_directory: String,
    models_directory: String,
    tessdata_directory: Option<String>,
    model_files: Vec<ResourceFile>,
    sidecar_files: Vec<ResourceFile>,
}

fn workspace_binaries_directory() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("src-tauri")
        .join("binaries")
}

fn effective_binaries_directory() -> PathBuf {
    let user_directory = binaries::user_binaries_directory();
    if user_directory.is_dir() {
        return user_directory;
    }

    binaries::data_directory("")
        .filter(|path| path.is_dir())
        .unwrap_or_else(workspace_binaries_directory)
}

fn ensure_directory(path: PathBuf) -> Result<PathBuf, String> {
    fs::create_dir_all(&path).map_err(|error| format!("No se pudo crear {}: {error}", path.display()))?;
    Ok(path)
}

fn file_info(path: PathBuf) -> Option<ResourceFile> {
    let metadata = fs::metadata(&path).ok()?;
    if !metadata.is_file() {
        return None;
    }

    Some(ResourceFile {
        name: path.file_name()?.to_string_lossy().into_owned(),
        path: path.to_string_lossy().into_owned(),
        size_bytes: metadata.len(),
    })
}

fn list_files(directory: &PathBuf, extension: Option<&str>) -> Vec<ResourceFile> {
    let mut files = fs::read_dir(directory)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if let Some(expected) = extension {
                let actual = path.extension()?.to_string_lossy().to_lowercase();
                if actual != expected {
                    return None;
                }
            }
            file_info(path)
        })
        .collect::<Vec<_>>();

    files.sort_by(|a, b| a.name.cmp(&b.name));
    files
}

fn open_directory(path: PathBuf) -> Result<(), String> {
    let path = ensure_directory(path)?;

    #[cfg(target_os = "windows")]
    {
        binaries::command("explorer")
            .arg(path)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la carpeta: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        binaries::command("open")
            .arg(path)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la carpeta: {error}"))?;
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        binaries::command("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la carpeta: {error}"))?;
        return Ok(());
    }
}

#[tauri::command]
pub fn resource_manager_status() -> Result<ResourceManagerStatus, String> {
    let user_binaries_directory = ensure_directory(binaries::user_binaries_directory())?;
    let binaries_directory = ensure_directory(effective_binaries_directory())?;
    let models_directory = ensure_directory(user_binaries_directory.join("models"))?;
    let tessdata_directory = binaries::data_directory("tessdata").map(|path| path.to_string_lossy().into_owned());

    Ok(ResourceManagerStatus {
        sidecar_files: list_files(&binaries_directory, None),
        model_files: list_files(&models_directory, Some("bin")),
        binaries_directory: binaries_directory.to_string_lossy().into_owned(),
        user_binaries_directory: user_binaries_directory.to_string_lossy().into_owned(),
        models_directory: models_directory.to_string_lossy().into_owned(),
        tessdata_directory,
    })
}

#[tauri::command]
pub fn open_resource_folder(kind: String) -> Result<(), String> {
    let base = binaries::user_binaries_directory();
    match kind.as_str() {
        "binaries" => open_directory(base),
        "models" => open_directory(base.join("models")),
        "tessdata" => open_directory(base.join("tessdata")),
        _ => Err("Carpeta de recursos no compatible".into()),
    }
}
