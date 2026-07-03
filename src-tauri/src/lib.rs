mod tools;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            tools::qr::generate_qr,
            tools::background::remove_white_background,
            tools::image_converter::image_converter,
            tools::image_resizer::image_resizer,
            tools::pdf_tools::pdf_tools,
            tools::video_converter::video_converter,
            tools::video_converter::ffmpeg_available,
            tools::batch_renamer::batch_renamer,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar Manager Local");
}
