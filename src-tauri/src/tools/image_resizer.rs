use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD, Engine};
use image::imageops::FilterType;
use image::ImageFormat;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResizerInput {
    image_data: String,
    width: u32,
    height: u32,
}

#[tauri::command]
pub fn image_resizer(input: ImageResizerInput) -> Result<String, String> {
    if input.width == 0 || input.height == 0 {
        return Err("El ancho y alto deben ser mayores que 0".into());
    }

    let encoded = input
        .image_data
        .split_once(',')
        .map(|(_, data)| data)
        .ok_or("Formato de imagen inválido")?;
    let bytes = STANDARD.decode(encoded).map_err(|error| error.to_string())?;
    if bytes.len() > 25 * 1024 * 1024 {
        return Err("La imagen no puede superar 25 MB".into());
    }

    let image = image::load_from_memory(&bytes)
        .map_err(|error| format!("No se pudo abrir la imagen: {error}"))?;
    let resized = image.resize(input.width, input.height, FilterType::Lanczos3);

    let mut output = Cursor::new(Vec::new());
    resized
        .write_to(&mut output, ImageFormat::Png)
        .map_err(|error| error.to_string())?;

    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(output.into_inner())
    ))
}
