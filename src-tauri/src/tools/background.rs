use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{ImageFormat, RgbaImage};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWhiteBackgroundInput {
    image_data: String,
    tolerance: u8,
}

#[tauri::command]
pub fn remove_white_background(input: RemoveWhiteBackgroundInput) -> Result<String, String> {
    let encoded = input
        .image_data
        .split_once(',')
        .map(|(_, data)| data)
        .ok_or("Formato de imagen inválido")?;
    let bytes = STANDARD.decode(encoded).map_err(|error| error.to_string())?;
    if bytes.len() > 25 * 1024 * 1024 {
        return Err("La imagen no puede superar 25 MB".into());
    }

    let mut image: RgbaImage = image::load_from_memory(&bytes)
        .map_err(|error| format!("No se pudo abrir la imagen: {error}"))?
        .to_rgba8();
    let threshold = 255_u8.saturating_sub(input.tolerance);

    for pixel in image.pixels_mut() {
        if pixel[0] >= threshold && pixel[1] >= threshold && pixel[2] >= threshold {
            pixel[3] = 0;
        }
    }

    let mut output = Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(image)
        .write_to(&mut output, ImageFormat::Png)
        .map_err(|error| error.to_string())?;

    Ok(format!("data:image/png;base64,{}", STANDARD.encode(output.into_inner())))
}
