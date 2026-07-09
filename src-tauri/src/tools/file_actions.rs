use std::{fs, path::Path};

use super::binaries;

fn ensure_existing_path(path: &str) -> Result<&Path, String> {
    let path = Path::new(path);
    if !path.exists() {
        return Err("La ruta no existe".into());
    }
    Ok(path)
}

#[tauri::command]
pub fn write_text_output(path: String, content: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Selecciona dónde guardar el texto".into());
    }
    if content.len() > 10 * 1024 * 1024 {
        return Err("El texto supera el límite de 10 MB".into());
    }

    let path = Path::new(&path);
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .unwrap_or_default();
    if !matches!(extension.as_str(), "txt" | "md" | "html" | "htm") {
        return Err("La salida debe ser TXT, Markdown o HTML".into());
    }
    let parent = path
        .parent()
        .ok_or("La salida debe estar dentro de una carpeta")?;
    if !parent.is_dir() {
        return Err("La carpeta de salida no existe".into());
    }

    fs::write(path, content).map_err(|error| format!("No se pudo guardar el texto: {error}"))
}

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    let path = ensure_existing_path(&path)?;

    #[cfg(target_os = "windows")]
    {
        binaries::command("explorer")
            .arg(path)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la ruta: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        binaries::command("open")
            .arg(path)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la ruta: {error}"))?;
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        binaries::command("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la ruta: {error}"))?;
        return Ok(());
    }
}

#[tauri::command]
pub fn reveal_path(path: String) -> Result<(), String> {
    let path = ensure_existing_path(&path)?;

    #[cfg(target_os = "windows")]
    {
        let mut selector = String::from("/select,");
        selector.push_str(&path.to_string_lossy());
        binaries::command("explorer")
            .arg(selector)
            .spawn()
            .map_err(|error| format!("No se pudo mostrar la ruta en Explorer: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        binaries::command("open")
            .args(["-R", &path.to_string_lossy()])
            .spawn()
            .map_err(|error| format!("No se pudo mostrar la ruta en Finder: {error}"))?;
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let directory = if path.is_dir() {
            path
        } else {
            path.parent().ok_or("La ruta no tiene carpeta padre")?
        };
        binaries::command("xdg-open")
            .arg(directory)
            .spawn()
            .map_err(|error| format!("No se pudo abrir la carpeta: {error}"))?;
        return Ok(());
    }
}

#[cfg(test)]
mod tests {
    use super::write_text_output;

    #[test]
    fn writes_text_with_an_allowed_extension() {
        let path =
            std::env::temp_dir().join(format!("managerlocal-export-{}.txt", std::process::id()));
        let _ = std::fs::remove_file(&path);
        write_text_output(path.to_string_lossy().into_owned(), "texto local".into()).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "texto local");
        let _ = std::fs::remove_file(path);
    }
}
