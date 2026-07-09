use std::{fs, io::BufWriter, path::{Path, PathBuf}};

use image::{codecs::jpeg::JpegEncoder, DynamicImage};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageCompressorInput {
    paths: Vec<String>,
    output_directory: String,
    quality: u8,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionResult {
    file_name: String,
    output_path: String,
    original_bytes: u64,
    compressed_bytes: u64,
}

fn safe_output_path(directory: &Path, source: &Path) -> PathBuf {
    let stem = source.file_stem().and_then(|value| value.to_str()).unwrap_or("imagen");
    let mut candidate = directory.join(format!("{stem}-comprimida.jpg"));
    let mut counter = 2;
    while candidate.exists() {
        candidate = directory.join(format!("{stem}-comprimida-{counter}.jpg"));
        counter += 1;
    }
    candidate
}

#[tauri::command]
pub fn image_compressor(input: ImageCompressorInput) -> Result<Vec<CompressionResult>, String> {
    if input.paths.is_empty() { return Err("Selecciona al menos una imagen".into()); }
    if input.paths.len() > 100 { return Err("Puedes comprimir un máximo de 100 imágenes por lote".into()); }
    if !(35..=95).contains(&input.quality) { return Err("La calidad debe estar entre 35 y 95".into()); }

    let output_directory = PathBuf::from(&input.output_directory);
    if !output_directory.is_dir() { return Err("La carpeta de salida no es válida".into()); }

    let mut results = Vec::with_capacity(input.paths.len());
    for raw_path in input.paths {
        let source = PathBuf::from(&raw_path);
        let metadata = fs::metadata(&source)
            .map_err(|error| format!("No se pudo leer {}: {error}", source.display()))?;
        if metadata.len() > 50 * 1024 * 1024 {
            return Err(format!("{} supera el límite de 50 MB", source.file_name().and_then(|value| value.to_str()).unwrap_or("La imagen")));
        }

        let image = image::open(&source)
            .map_err(|error| format!("No se pudo abrir {}: {error}", source.display()))?;
        let output_path = safe_output_path(&output_directory, &source);
        let file = fs::File::create(&output_path)
            .map_err(|error| format!("No se pudo crear {}: {error}", output_path.display()))?;
        let mut writer = BufWriter::new(file);

        let rgba = image.to_rgba8();
        let mut rgb = image::RgbImage::new(rgba.width(), rgba.height());
        for (x, y, pixel) in rgba.enumerate_pixels() {
            let alpha = pixel[3] as u16;
            let blend = |channel: u8| ((channel as u16 * alpha + 255 * (255 - alpha)) / 255) as u8;
            rgb.put_pixel(x, y, image::Rgb([blend(pixel[0]), blend(pixel[1]), blend(pixel[2])]));
        }

        JpegEncoder::new_with_quality(&mut writer, input.quality)
            .encode_image(&DynamicImage::ImageRgb8(rgb))
            .map_err(|error| format!("No se pudo comprimir {}: {error}", source.display()))?;
        drop(writer);

        let compressed_bytes = fs::metadata(&output_path)
            .map_err(|error| format!("No se pudo comprobar la salida: {error}"))?.len();
        results.push(CompressionResult {
            file_name: source.file_name().and_then(|value| value.to_str()).unwrap_or("imagen").to_string(),
            output_path: output_path.to_string_lossy().to_string(),
            original_bytes: metadata.len(),
            compressed_bytes,
        });
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compresses_an_image_and_reports_sizes() {
        let root = std::env::temp_dir().join(format!("manager-local-compress-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let source = root.join("original.png");
        image::RgbImage::from_pixel(120, 80, image::Rgb([120, 80, 200])).save(&source).unwrap();
        let result = image_compressor(ImageCompressorInput {
            paths: vec![source.to_string_lossy().to_string()],
            output_directory: root.to_string_lossy().to_string(),
            quality: 75,
        }).unwrap();
        assert_eq!(result.len(), 1);
        assert!(Path::new(&result[0].output_path).exists());
        assert!(result[0].compressed_bytes > 0);
        let _ = fs::remove_dir_all(root);
    }
}
