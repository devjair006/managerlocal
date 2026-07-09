use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::binaries;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfOptimizerRuntime {
    ghostscript: bool,
    mutool: bool,
    executable: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedPdfOptimizerInput {
    input_path: String,
    output_path: String,
    profile: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedPdfOptimizerResult {
    output_path: String,
    original_bytes: u64,
    optimized_bytes: u64,
    saved_bytes: u64,
    saved_percent: f64,
    profile: String,
    engine: String,
}

const GHOSTSCRIPT_CANDIDATES: &[&str] = if cfg!(target_os = "windows") {
    &["gswin64c", "gswin32c", "gs"]
} else {
    &["gs"]
};

fn ghostscript_executable() -> Option<String> {
    binaries::probe(GHOSTSCRIPT_CANDIDATES, &["--version"]).1
}

fn mutool_executable() -> Option<String> {
    binaries::probe(&["mutool"], &["clean"]).1
}

fn validate_profile(profile: &str) -> Result<&'static str, String> {
    match profile {
        "screen" => Ok("/screen"),
        "ebook" => Ok("/ebook"),
        "printer" => Ok("/printer"),
        "prepress" => Ok("/prepress"),
        "default" => Ok("/default"),
        _ => Err("Perfil de optimización no compatible".into()),
    }
}

fn validate_paths(input_path: &str, output_path: &str) -> Result<(), String> {
    if input_path.trim().is_empty() {
        return Err("Selecciona un PDF de entrada".into());
    }
    if output_path.trim().is_empty() {
        return Err("Selecciona una ruta de salida".into());
    }
    if !input_path.to_lowercase().ends_with(".pdf") || !Path::new(input_path).is_file() {
        return Err("El archivo de entrada debe ser un PDF válido".into());
    }
    if !output_path.to_lowercase().ends_with(".pdf") {
        return Err("El archivo de salida debe terminar en .pdf".into());
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
pub fn pdf_optimizer_runtime() -> PdfOptimizerRuntime {
    let ghostscript = ghostscript_executable();
    let mutool = mutool_executable();
    PdfOptimizerRuntime {
        ghostscript: ghostscript.is_some(),
        mutool: mutool.is_some(),
        executable: ghostscript.or(mutool),
    }
}

#[tauri::command]
pub fn optimize_pdf_advanced(input: AdvancedPdfOptimizerInput) -> Result<AdvancedPdfOptimizerResult, String> {
    validate_paths(&input.input_path, &input.output_path)?;
    let pdf_settings = validate_profile(&input.profile)?;
    let original_bytes = fs::metadata(&input.input_path).map_err(|error| error.to_string())?.len();

    let (output, engine) = if let Some(executable) = ghostscript_executable() {
        let output = binaries::command(&executable)
            .arg("-sDEVICE=pdfwrite")
            .arg("-dCompatibilityLevel=1.4")
            .arg(format!("-dPDFSETTINGS={pdf_settings}"))
            .arg("-dNOPAUSE")
            .arg("-dQUIET")
            .arg("-dBATCH")
            .arg(format!("-sOutputFile={}", input.output_path))
            .arg(&input.input_path)
            .output()
            .map_err(|error| format!("No se pudo ejecutar Ghostscript: {error}"))?;
        (output, "Ghostscript".to_string())
    } else if let Some(executable) = mutool_executable() {
        let output = binaries::command(&executable)
            .args(["clean", "-gggg", "-z", "-f", "-i", "-c"])
            .arg(&input.input_path)
            .arg(&input.output_path)
            .output()
            .map_err(|error| format!("No se pudo ejecutar MuPDF/mutool: {error}"))?;
        (output, "MuPDF/mutool".to_string())
    } else {
        return Err("Falta Ghostscript o MuPDF/mutool. Instala uno o empaquétalo como sidecar para usar esta herramienta.".into());
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() { format!("{engine} no pudo optimizar el PDF") } else { stderr });
    }

    let optimized_bytes = fs::metadata(&input.output_path).map_err(|error| error.to_string())?.len();
    let saved_bytes = original_bytes.saturating_sub(optimized_bytes);
    let saved_percent = if original_bytes == 0 { 0.0 } else { (saved_bytes as f64 / original_bytes as f64) * 100.0 };

    Ok(AdvancedPdfOptimizerResult {
        output_path: input.output_path,
        original_bytes,
        optimized_bytes,
        saved_bytes,
        saved_percent,
        profile: input.profile,
        engine,
    })
}
