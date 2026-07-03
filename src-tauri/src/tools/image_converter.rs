use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConverterInput {
    sample: String,
}

#[tauri::command]
pub fn image_converter(input: ImageConverterInput) -> Result<String, String> {
    if input.sample.trim().is_empty() {
        return Err("El valor no puede estar vacío".into());
    }

    // TODO: implementa el procesamiento nativo
    Ok(input.sample)
}
