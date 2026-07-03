use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, ImageFormat, Luma};
use qrcode::QrCode;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateQrInput {
    content: String,
    size: u32,
}

#[tauri::command]
pub fn generate_qr(input: GenerateQrInput) -> Result<String, String> {
    if input.content.trim().is_empty() {
        return Err("El contenido no puede estar vacío".into());
    }

    let code = QrCode::new(input.content.as_bytes()).map_err(|error| error.to_string())?;
    let image = code
        .render::<Luma<u8>>()
        .min_dimensions(input.size, input.size)
        .max_dimensions(input.size, input.size)
        .quiet_zone(true)
        .build();

    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageLuma8(image)
        .write_to(&mut bytes, ImageFormat::Png)
        .map_err(|error| error.to_string())?;

    Ok(format!("data:image/png;base64,{}", STANDARD.encode(bytes.into_inner())))
}
