mod tools;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            tools::qr::generate_qr,
            tools::background::remove_white_background,
            tools::image_converter::image_converter
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar Manager Local");
}
