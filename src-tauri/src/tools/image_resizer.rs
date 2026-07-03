use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResizerInput {
    sample: String,
}

#[tauri::command]
pub fn image_resizer(input: ImageResizerInput) -> Result<String, String> {
    if input.sample.trim().is_empty() {
        return Err("El valor no puede estar vacío".into());
    }

    // TODO: implementa el procesamiento nativo
    Ok(input.sample)
}
