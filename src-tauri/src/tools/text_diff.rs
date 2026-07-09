use std::{fs, path::Path};

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    if !path.is_file() { return Err("El archivo seleccionado no existe".into()); }
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    if metadata.len() > 5 * 1024 * 1024 { return Err("El archivo supera el límite de 5 MB".into()); }
    fs::read_to_string(path).map_err(|_| "El archivo no contiene texto UTF-8 compatible".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reads_utf8_text() {
        let path = std::env::temp_dir().join(format!("managerlocal-diff-{}.txt", std::process::id()));
        fs::write(&path, "línea uno\nlínea dos").unwrap();
        assert!(read_text_file(path.to_string_lossy().into_owned()).unwrap().contains("línea dos"));
        let _ = fs::remove_file(path);
    }
}
