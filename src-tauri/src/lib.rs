mod tools;

use tools::ai_background::AiBackgroundCancelToken;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(std::sync::Mutex::new(AiBackgroundCancelToken { sender: None }))
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
            tools::image_compressor::image_compressor,
            tools::text_diff::read_text_file,
            tools::document_converter::convert_document,
            tools::local_ocr::ocr_runtime,
            tools::local_ocr::extract_text_ocr,
            tools::advanced_pdf_optimizer::pdf_optimizer_runtime,
            tools::advanced_pdf_optimizer::optimize_pdf_advanced,
            tools::local_transcription::transcription_runtime,
            tools::local_transcription::transcribe_local_audio,
            tools::plugin_system::plugin_system_status,
            tools::plugin_system::scan_local_plugins,
            tools::media_downloader::media_downloader_runtime,
            tools::media_downloader::download_permitted_media,
            tools::ai_background::ai_background_runtime,
            tools::ai_background::remove_background_ai,
            tools::ai_background::cancel_remove_background_ai,
            tools::dependency_center::dependency_center_status,
            tools::resource_manager::resource_manager_status,
            tools::resource_manager::open_resource_folder,
            tools::file_actions::open_path,
            tools::file_actions::reveal_path,
            tools::file_actions::write_text_output,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar Manager Local");
}
