use std::io::Cursor;

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{codecs::jpeg::JpegEncoder, DynamicImage, ImageFormat};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConverterInput {
    image_data: String,
    format: String,
    quality: u8,
}

#[tauri::command]
pub fn image_converter(input: ImageConverterInput) -> Result<String, String> {
    let encoded = input.image_data.split_once(',').map(|(_, data)| data).ok_or("Formato de imagen inválido")?;
    let bytes = STANDARD.decode(encoded).map_err(|error| error.to_string())?;
    if bytes.len() > 25 * 1024 * 1024 { return Err("La imagen no puede superar 25 MB".into()); }
    if !(40..=100).contains(&input.quality) { return Err("La calidad debe estar entre 40 y 100".into()); }

    let image = image::load_from_memory(&bytes).map_err(|error| format!("No se pudo abrir la imagen: {error}"))?;
    let mut output = Cursor::new(Vec::new());
    let mime = match input.format.as_str() {
        "png" => {
            image.write_to(&mut output, ImageFormat::Png).map_err(|error| error.to_string())?;
            "image/png"
        }
        "jpg" => {
            let rgb = DynamicImage::ImageRgb8(image.to_rgb8());
            JpegEncoder::new_with_quality(&mut output, input.quality)
                .encode_image(&rgb)
                .map_err(|error| error.to_string())?;
            "image/jpeg"
        }
        "webp" => {
            image.write_to(&mut output, ImageFormat::WebP).map_err(|error| error.to_string())?;
            "image/webp"
        }
        _ => return Err("Formato de salida no compatible".into()),
    };
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(output.into_inner())))
}
