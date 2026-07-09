use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use image::GenericImageView;
use lopdf::{content::{Content, Operation}, dictionary, Document, Object, ObjectId, Stream};
use serde::Deserialize;

use super::binaries;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfToolsInput {
    operation: String,
    input_paths: Vec<String>,
    output_path: String,
    pages: Vec<u32>,
}

fn validate(input: &PdfToolsInput) -> Result<(), String> {
    if input.input_paths.is_empty() { return Err("Selecciona al menos un PDF".into()); }
    if input.output_path.trim().is_empty() { return Err("Selecciona una ruta de salida".into()); }
    if input.operation != "pdf_to_images" && !input.output_path.to_lowercase().ends_with(".pdf") { return Err("El archivo de salida debe terminar en .pdf".into()); }
    for path in &input.input_paths {
        if !Path::new(path).is_file() { return Err(format!("Archivo no válido: {path}")); }
        if input.operation != "images_to_pdf" && !path.to_lowercase().ends_with(".pdf") { return Err(format!("PDF no válido: {path}")); }
    }
    Ok(())
}

fn images_to_pdf(paths: &[String], output_path: &str) -> Result<(), String> {
    let mut document = Document::with_version("1.5");
    let pages_id = document.new_object_id();
    let mut page_ids = Vec::with_capacity(paths.len());
    for path in paths {
        let image = image::open(path).map_err(|error| format!("No se pudo abrir {path}: {error}"))?;
        let (pixel_width, pixel_height) = image.dimensions();
        let rgba = image.to_rgba8();
        let mut rgb = Vec::with_capacity(pixel_width as usize * pixel_height as usize * 3);
        for pixel in rgba.pixels() {
            let alpha = pixel[3] as u16;
            for channel in 0..3 { rgb.push(((pixel[channel] as u16 * alpha + 255 * (255 - alpha)) / 255) as u8); }
        }
        let mut image_stream = Stream::new(dictionary! {
            "Type" => "XObject", "Subtype" => "Image", "Width" => pixel_width as i64,
            "Height" => pixel_height as i64, "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8,
        }, rgb);
        image_stream.compress().map_err(|error| error.to_string())?;
        let image_id = document.add_object(image_stream);
        let width = pixel_width as f32 * 0.75;
        let height = pixel_height as f32 * 0.75;
        let content = Content { operations: vec![
            Operation::new("q", vec![]),
            Operation::new("cm", vec![width.into(), 0.into(), 0.into(), height.into(), 0.into(), 0.into()]),
            Operation::new("Do", vec![Object::Name(b"Image0".to_vec())]), Operation::new("Q", vec![]),
        ]};
        let content_id = document.add_object(Stream::new(dictionary! {}, content.encode().map_err(|error| error.to_string())?));
        let page_id = document.add_object(dictionary! {
            "Type" => "Page", "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), width.into(), height.into()],
            "Resources" => dictionary! { "XObject" => dictionary! { "Image0" => image_id } }, "Contents" => content_id,
        });
        page_ids.push(page_id);
    }
    document.objects.insert(pages_id, Object::Dictionary(dictionary! {
        "Type" => "Pages", "Kids" => page_ids.iter().copied().map(Object::Reference).collect::<Vec<_>>(), "Count" => page_ids.len() as i64,
    }));
    let catalog_id = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    document.trailer.set("Root", catalog_id);
    document.compress();
    document.save(output_path).map_err(|error| error.to_string())?;
    Ok(())
}

fn pdf_to_images(path: &str, output_directory: &str) -> Result<String, String> {
    let directory = PathBuf::from(output_directory);
    if !directory.is_dir() { return Err("Selecciona una carpeta de salida válida".into()); }
    let stem = Path::new(path).file_stem().and_then(|value| value.to_str()).unwrap_or("pagina");
    let prefix = directory.join(format!("{stem}-pagina"));
    let output = binaries::candidate_command(&["pdftoppm"]).args(["-png", "-r", "150", path]).arg(&prefix).output()
        .map_err(|_| "Para convertir PDF a imágenes falta Poppler (pdftoppm). Instálalo y reinicia Manager Local.".to_string())?;
    if !output.status.success() { return Err(format!("No se pudo renderizar el PDF: {}", String::from_utf8_lossy(&output.stderr).trim())); }
    Ok(directory.to_string_lossy().into_owned())
}

fn merge_documents(paths: &[String], output_path: &str) -> Result<(), String> {
    if paths.len() < 2 { return Err("Selecciona al menos dos PDF para unir".into()); }
    let mut max_id = 1;
    let mut all_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut all_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();

    for path in paths {
        let mut source = Document::load(path).map_err(|error| format!("No se pudo abrir {path}: {error}"))?;
        source.renumber_objects_with(max_id);
        max_id = source.max_id + 1;
        for object_id in source.get_pages().into_values() {
            let page = source.get_object(object_id).map_err(|error| error.to_string())?.to_owned();
            all_pages.insert(object_id, page);
        }
        all_objects.extend(source.objects);
    }

    let mut document = Document::with_version("1.5");
    let mut catalog: Option<(ObjectId, Object)> = None;
    let mut pages_root: Option<(ObjectId, Object)> = None;

    for (id, object) in all_objects {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => if catalog.is_none() { catalog = Some((id, object)); },
            b"Pages" => if pages_root.is_none() { pages_root = Some((id, object)); },
            b"Page" | b"Outlines" | b"Outline" => {},
            _ => { document.objects.insert(id, object); }
        }
    }

    let (pages_id, pages_object) = pages_root.ok_or("El PDF no contiene un árbol de páginas válido")?;
    for (id, object) in &all_pages {
        let mut dictionary = object.as_dict().map_err(|error| error.to_string())?.clone();
        dictionary.set("Parent", pages_id);
        document.objects.insert(*id, Object::Dictionary(dictionary));
    }
    let mut pages_dictionary = pages_object.as_dict().map_err(|error| error.to_string())?.clone();
    pages_dictionary.set("Count", all_pages.len() as u32);
    pages_dictionary.set("Kids", all_pages.keys().copied().map(Object::Reference).collect::<Vec<_>>());
    document.objects.insert(pages_id, Object::Dictionary(pages_dictionary));

    let (catalog_id, catalog_object) = catalog.ok_or("El PDF no contiene un catálogo válido")?;
    let mut catalog_dictionary = catalog_object.as_dict().map_err(|error| error.to_string())?.clone();
    catalog_dictionary.set("Pages", pages_id);
    catalog_dictionary.remove(b"Outlines");
    document.objects.insert(catalog_id, Object::Dictionary(catalog_dictionary));
    document.trailer.set("Root", catalog_id);
    document.max_id = document.objects.keys().map(|id| id.0).max().unwrap_or(1);
    document.renumber_objects();
    document.compress();
    document.save(output_path).map_err(|error| error.to_string())?;
    Ok(())
}

fn extract_pages(path: &str, output_path: &str, selected: &[u32]) -> Result<(), String> {
    if selected.is_empty() { return Err("Indica al menos una página".into()); }
    let mut document = Document::load(path).map_err(|error| error.to_string())?;
    let available = document.get_pages();
    for page in selected {
        if !available.contains_key(page) { return Err(format!("La página {page} no existe")); }
    }
    let remove = available.keys().filter(|page| !selected.contains(page)).copied().collect::<Vec<_>>();
    document.delete_pages(&remove);
    document.prune_objects();
    document.compress();
    document.save(output_path).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pdf_tools(input: PdfToolsInput) -> Result<String, String> {
    validate(&input)?;
    match input.operation.as_str() {
        "merge" => merge_documents(&input.input_paths, &input.output_path)?,
        "extract" => extract_pages(&input.input_paths[0], &input.output_path, &input.pages)?,
        "compress" => {
            let mut document = Document::load(&input.input_paths[0]).map_err(|error| error.to_string())?;
            document.prune_objects();
            document.compress();
            document.save(&input.output_path).map_err(|error| error.to_string())?;
        }
        "images_to_pdf" => images_to_pdf(&input.input_paths, &input.output_path)?,
        "pdf_to_images" => return pdf_to_images(&input.input_paths[0], &input.output_path),
        _ => return Err("Operación PDF no compatible".into()),
    }
    Ok(input.output_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::dictionary;
    use std::fs;

    fn sample_pdf(path: &Path) {
        let mut document = Document::with_version("1.5");
        let pages_id = document.new_object_id();
        let page_id = document.add_object(dictionary! { "Type" => "Page", "Parent" => pages_id, "MediaBox" => vec![0.into(), 0.into(), 100.into(), 100.into()] });
        document.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => vec![page_id.into()], "Count" => 1 }));
        let catalog_id = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        document.trailer.set("Root", catalog_id);
        document.save(path).unwrap();
    }

    #[test]
    fn merges_and_extracts_pdf_pages() {
        let directory = std::env::temp_dir().join(format!("managerlocal-pdf-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory); fs::create_dir_all(&directory).unwrap();
        let first = directory.join("first.pdf"); let second = directory.join("second.pdf"); let merged = directory.join("merged.pdf"); let extracted = directory.join("extracted.pdf");
        sample_pdf(&first); sample_pdf(&second);
        merge_documents(&[first.to_string_lossy().into_owned(), second.to_string_lossy().into_owned()], merged.to_str().unwrap()).unwrap();
        assert_eq!(Document::load(&merged).unwrap().get_pages().len(), 2);
        extract_pages(merged.to_str().unwrap(), extracted.to_str().unwrap(), &[2]).unwrap();
        assert_eq!(Document::load(&extracted).unwrap().get_pages().len(), 1);
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn creates_one_pdf_page_per_image() {
        let directory = std::env::temp_dir().join(format!("managerlocal-images-pdf-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory); fs::create_dir_all(&directory).unwrap();
        let first = directory.join("first.png"); let second = directory.join("second.png"); let output = directory.join("images.pdf");
        image::RgbaImage::from_pixel(20, 10, image::Rgba([255, 0, 0, 128])).save(&first).unwrap();
        image::RgbaImage::from_pixel(10, 20, image::Rgba([0, 0, 255, 255])).save(&second).unwrap();
        images_to_pdf(&[first.to_string_lossy().into_owned(), second.to_string_lossy().into_owned()], output.to_str().unwrap()).unwrap();
        assert_eq!(Document::load(&output).unwrap().get_pages().len(), 2);
        let _ = fs::remove_dir_all(directory);
    }
}
