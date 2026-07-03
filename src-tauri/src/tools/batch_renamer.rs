use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchRenamerInput {
    sample: String,
}

#[tauri::command]
pub fn batch_renamer(input: BatchRenamerInput) -> Result<String, String> {
    if input.sample.trim().is_empty() {
        return Err("El valor no puede estar vacío".into());
    }

    // TODO: implementa el procesamiento nativo
    Ok(input.sample)
}
