use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use super::binaries;

#[derive(Serialize)]
pub struct OcrRuntime {
    tesseract: bool,
    pdftoppm: bool,
}

#[derive(Deserialize)]
pub struct OcrInput {
    path: String,
    language: String,
}

fn command_exists(name: &str, args: &[&str]) -> bool {
    binaries::probe(&[name], args).0
}

#[tauri::command]
pub fn ocr_runtime() -> OcrRuntime {
    OcrRuntime {
        tesseract: command_exists("tesseract", &["--version"]),
        pdftoppm: command_exists("pdftoppm", &["-v"]),
    }
}

fn recognize_image(path: &Path, language: &str) -> Result<String, String> {
    let mut command = binaries::candidate_command(&["tesseract"]);
    if let Some(tessdata) = binaries::data_directory("tessdata") {
        command.env("TESSDATA_PREFIX", tessdata);
    }
    let output = command
        .arg(path)
        .arg("stdout")
        .args(["-l", language, "--psm", "3"])
        .output()
        .map_err(|_| "Tesseract OCR no está instalado o no está disponible".to_string())?;

    if !output.status.success() {
        return Err(format!(
            "Tesseract no pudo procesar el archivo: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    String::from_utf8(output.stdout).map_err(|_| "Tesseract devolvió texto con codificación no compatible".into())
}

fn render_pdf(path: &Path, directory: &Path) -> Result<Vec<PathBuf>, String> {
    let prefix = directory.join("pagina");
    let output = binaries::candidate_command(&["pdftoppm"])
        .args(["-png", "-r", "200"])
        .arg(path)
        .arg(&prefix)
        .output()
        .map_err(|_| "Para leer PDF escaneados falta Poppler (pdftoppm)".to_string())?;

    if !output.status.success() {
        return Err(format!("No se pudo abrir el PDF: {}", String::from_utf8_lossy(&output.stderr).trim()));
    }

    let mut pages = fs::read_dir(directory)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|item| item.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("png")))
        .collect::<Vec<_>>();
    pages.sort();
    Ok(pages)
}

#[tauri::command]
pub fn extract_text_ocr(input: OcrInput) -> Result<String, String> {
    let path = Path::new(&input.path);
    if !path.is_file() {
        return Err("Selecciona un archivo válido".into());
    }
    if fs::metadata(path).map_err(|error| error.to_string())?.len() > 50 * 1024 * 1024 {
        return Err("El archivo supera el límite de 50 MB".into());
    }
    if !matches!(input.language.as_str(), "spa" | "eng" | "spa+eng") {
        return Err("Idioma OCR no compatible".into());
    }

    if path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("pdf")) {
        let directory = std::env::temp_dir().join(format!("managerlocal-ocr-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        let result = (|| {
            let pages = render_pdf(path, &directory)?;
            if pages.is_empty() {
                return Err("El PDF no contiene páginas renderizables".into());
            }
            let mut text = String::new();
            for (index, page) in pages.iter().enumerate() {
                if index > 0 {
                    text.push_str(&format!("\n\n--- Página {} ---\n\n", index + 1));
                }
                text.push_str(&recognize_image(page, &input.language)?);
            }
            Ok(text)
        })();
        let _ = fs::remove_dir_all(&directory);
        result
    } else {
        recognize_image(path, &input.language)
    }
}
