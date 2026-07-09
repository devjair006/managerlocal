use std::path::Path;

use serde::Deserialize;

use super::binaries;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoConverterInput { input_path: String, output_path: String, format: String }

fn probe_duration(path: &str) -> Option<f64> {
    let output = binaries::candidate_command(&["ffprobe"])
        .args(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path])
        .output()
        .ok()?;
    if !output.status.success() { return None; }
    String::from_utf8_lossy(&output.stdout).trim().parse().ok()
}

#[tauri::command]
pub fn ffmpeg_available() -> bool {
    binaries::probe(&["ffmpeg"], &["-version"]).0
}

#[tauri::command]
pub fn video_converter(input: VideoConverterInput) -> Result<String, String> {
    if !Path::new(&input.input_path).is_file() { return Err("El archivo de entrada no existe".into()); }
    let expected_extension = format!(".{}", input.format);
    if !input.output_path.to_lowercase().ends_with(&expected_extension) { return Err(format!("La salida debe terminar en {expected_extension}")); }

    let mut command = binaries::candidate_command(&["ffmpeg"]);
    let source_duration = probe_duration(&input.input_path);
    command.args(["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+genpts", "-i", &input.input_path, "-map_metadata", "-1", "-avoid_negative_ts", "make_zero"]);
    match input.format.as_str() {
        "mp4" => { command.args(["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1", "-tag:v", "avc1", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"]); }
        "webm" => { command.args(["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus"]); }
        "mp3" => { command.args(["-vn", "-c:a", "libmp3lame", "-q:a", "2"]); }
        "wav" => { command.args(["-vn", "-c:a", "pcm_s16le"]); }
        "m4a" => { command.args(["-vn", "-c:a", "aac", "-b:a", "192k"]); }
        "gif" => { command.args(["-vf", "fps=12,scale=960:-1:flags=lanczos", "-loop", "0"]); }
        _ => return Err("Formato multimedia no compatible".into()),
    }
    command.arg(&input.output_path);
    let output = command.output().map_err(|_| "FFmpeg no está instalado o no está disponible en PATH".to_string())?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if message.is_empty() { "FFmpeg no pudo convertir el archivo".into() } else { message });
    }
    if let (Some(source), Some(converted)) = (source_duration, probe_duration(&input.output_path)) {
        if source > 1.0 && converted < source * 0.90 {
            let _ = std::fs::remove_file(&input.output_path);
            return Err(format!("La conversión quedó truncada: original {:.1}s, salida {:.1}s. No se guardó el archivo incompleto.", source, converted));
        }
    }
    Ok(input.output_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn converts_generated_audio_when_ffmpeg_is_available() {
        if !ffmpeg_available() { return; }
        let directory = std::env::temp_dir().join(format!("managerlocal-media-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory); fs::create_dir_all(&directory).unwrap();
        let source = directory.join("source.wav"); let output = directory.join("output.mp3");
        let status = binaries::candidate_command(&["ffmpeg"]).args(["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.2", source.to_str().unwrap()]).status().unwrap();
        assert!(status.success());
        video_converter(VideoConverterInput { input_path: source.to_string_lossy().into_owned(), output_path: output.to_string_lossy().into_owned(), format: "mp3".into() }).unwrap();
        assert!(output.metadata().unwrap().len() > 0);
        let _ = fs::remove_dir_all(directory);
    }
}
