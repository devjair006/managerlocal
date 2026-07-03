use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchRenamerInput { paths: Vec<String>, prefix: String, suffix: String, find: String, replace: String, numbering: bool, start_number: u32 }

#[derive(Serialize)]
pub struct RenameResult { from: String, to: String }

fn build_target(path: &Path, input: &BatchRenamerInput, index: usize) -> Result<PathBuf, String> {
    let stem = path.file_stem().and_then(|value| value.to_str()).ok_or("Nombre de archivo no válido")?;
    let replaced = if input.find.is_empty() { stem.to_string() } else { stem.replace(&input.find, &input.replace) };
    let number = if input.numbering { format!("_{:03}", input.start_number + index as u32) } else { String::new() };
    let new_stem = format!("{}{}{}{}", input.prefix, replaced, input.suffix, number);
    if new_stem.trim().is_empty() || new_stem.ends_with(['.', ' ']) || new_stem.chars().any(|char| "<>:\"/\\|?*".contains(char)) {
        return Err(format!("Nombre de salida no válido: {new_stem}"));
    }
    let file_name = match path.extension().and_then(|value| value.to_str()) { Some(extension) => format!("{new_stem}.{extension}"), None => new_stem };
    Ok(path.with_file_name(file_name))
}

#[tauri::command]
pub fn batch_renamer(input: BatchRenamerInput) -> Result<Vec<RenameResult>, String> {
    if input.paths.is_empty() { return Err("Selecciona al menos un archivo".into()); }
    if input.paths.len() > 1000 { return Err("El límite es de 1000 archivos por operación".into()); }
    let originals = input.paths.iter().map(PathBuf::from).collect::<Vec<_>>();
    for path in &originals { if !path.is_file() { return Err(format!("El archivo no existe: {}", path.display())); } }
    let targets = originals.iter().enumerate().map(|(index, path)| build_target(path, &input, index)).collect::<Result<Vec<_>, _>>()?;
    let unique = targets.iter().map(|path| path.to_string_lossy().to_lowercase()).collect::<HashSet<_>>();
    if unique.len() != targets.len() { return Err("Las reglas producen nombres duplicados".into()); }
    let original_set = originals.iter().map(|path| path.to_string_lossy().to_lowercase()).collect::<HashSet<_>>();
    for target in &targets {
        if target.exists() && !original_set.contains(&target.to_string_lossy().to_lowercase()) { return Err(format!("Ya existe: {}", target.display())); }
    }

    let temporary = originals.iter().enumerate().map(|(index, path)| path.with_file_name(format!(".managerlocal-{}-{index}.tmp", std::process::id()))).collect::<Vec<_>>();
    for (index, (original, temp)) in originals.iter().zip(&temporary).enumerate() {
        if let Err(error) = fs::rename(original, temp) {
            for rollback in 0..index { let _ = fs::rename(&temporary[rollback], &originals[rollback]); }
            return Err(format!("No se pudo preparar {}: {error}", original.display()));
        }
    }
    for (index, (temp, target)) in temporary.iter().zip(&targets).enumerate() {
        if let Err(error) = fs::rename(temp, target) {
            for rollback in index..temporary.len() { if temporary[rollback].exists() { let _ = fs::rename(&temporary[rollback], &originals[rollback]); } }
            for rollback in 0..index { if targets[rollback].exists() { let _ = fs::rename(&targets[rollback], &originals[rollback]); } }
            return Err(format!("No se pudo crear {}: {error}", target.display()));
        }
    }
    Ok(originals.iter().zip(targets).map(|(from, to)| RenameResult { from: from.to_string_lossy().into_owned(), to: to.to_string_lossy().into_owned() }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renames_multiple_files_with_preview_rules() {
        let directory = std::env::temp_dir().join(format!("managerlocal-rename-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory); fs::create_dir_all(&directory).unwrap();
        let first = directory.join("foto vieja.txt"); let second = directory.join("otra vieja.txt");
        fs::write(&first, b"one").unwrap(); fs::write(&second, b"two").unwrap();
        let result = batch_renamer(BatchRenamerInput { paths: vec![first.to_string_lossy().into_owned(), second.to_string_lossy().into_owned()], prefix: "proyecto-".into(), suffix: "-final".into(), find: "vieja".into(), replace: "nueva".into(), numbering: true, start_number: 1 }).unwrap();
        assert_eq!(result.len(), 2);
        assert!(directory.join("proyecto-foto nueva-final_001.txt").exists());
        assert!(directory.join("proyecto-otra nueva-final_002.txt").exists());
        let _ = fs::remove_dir_all(directory);
    }
}
