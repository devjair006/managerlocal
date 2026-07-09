use std::fs;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose, Engine as _};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use tauri::Manager;

const MANIFEST_FILE: &str = "managerlocal.plugin.json";
const TRUSTED_PUBLISHERS_FILE: &str = "trusted-publishers.json";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSystemStatus {
    plugins_directory: String,
    trusted_publishers: usize,
    policy: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginAudit {
    id: String,
    name: String,
    version: String,
    description: String,
    author: String,
    directory: String,
    entry: String,
    permissions: Vec<PluginPermission>,
    signature_status: String,
    trusted: bool,
    runnable: bool,
    issues: Vec<String>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginPermission {
    id: String,
    reason: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PluginManifest {
    schema_version: u32,
    id: String,
    name: String,
    version: String,
    description: String,
    author: String,
    entry: String,
    permissions: Vec<PluginPermission>,
    signature: Option<PluginSignature>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PluginSignature {
    algorithm: String,
    key_id: String,
    public_key: String,
    value: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrustedPublisher {
    key_id: String,
    public_key: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PluginSignedPayload<'a> {
    schema_version: u32,
    id: &'a str,
    name: &'a str,
    version: &'a str,
    description: &'a str,
    author: &'a str,
    entry: &'a str,
    permissions: &'a [PluginPermission],
}

fn trusted_publishers(directory: &Path) -> Vec<TrustedPublisher> {
    let path = directory.join(TRUSTED_PUBLISHERS_FILE);
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<Vec<TrustedPublisher>>(&content).ok())
        .unwrap_or_default()
}

fn plugins_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?.join("plugins");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

fn validate_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value.chars().all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-' || character == '.')
}

fn signed_payload(manifest: &PluginManifest) -> Result<Vec<u8>, String> {
    let payload = PluginSignedPayload {
        schema_version: manifest.schema_version,
        id: &manifest.id,
        name: &manifest.name,
        version: &manifest.version,
        description: &manifest.description,
        author: &manifest.author,
        entry: &manifest.entry,
        permissions: &manifest.permissions,
    };
    serde_json::to_vec(&payload).map_err(|error| error.to_string())
}

fn verify_signature(manifest: &PluginManifest, trusted_publishers: &[TrustedPublisher]) -> Result<bool, String> {
    let Some(signature) = &manifest.signature else {
        return Err("unsigned".into());
    };
    if signature.algorithm != "ed25519" {
        return Err("Algoritmo de firma no compatible".into());
    }
    let Some(publisher) = trusted_publishers.iter().find(|publisher| publisher.key_id == signature.key_id) else {
        return Err("La llave del plugin no está en trusted-publishers.json".into());
    };
    if publisher.public_key != signature.public_key {
        return Err("La llave pública del manifiesto no coincide con el publicador confiable".into());
    }

    let public_key_bytes = general_purpose::STANDARD.decode(&signature.public_key).map_err(|_| "Llave pública inválida")?;
    let signature_bytes = general_purpose::STANDARD.decode(&signature.value).map_err(|_| "Firma inválida")?;
    let public_key_array: [u8; 32] = public_key_bytes.try_into().map_err(|_| "La llave pública Ed25519 debe tener 32 bytes")?;
    let signature_array: [u8; 64] = signature_bytes.try_into().map_err(|_| "La firma Ed25519 debe tener 64 bytes")?;
    let verifying_key = VerifyingKey::from_bytes(&public_key_array).map_err(|_| "Llave pública Ed25519 inválida")?;
    let signature = Signature::from_bytes(&signature_array);
    verifying_key.verify(&signed_payload(manifest)?, &signature).map_err(|_| "La firma no coincide con el manifiesto")?;
    Ok(true)
}

fn audit_manifest(directory: &Path, manifest_path: &Path, trusted_publishers: &[TrustedPublisher]) -> PluginAudit {
    let mut issues = Vec::new();
    let raw = fs::read_to_string(manifest_path);
    let manifest = raw
        .as_deref()
        .map_err(|error| error.to_string())
        .and_then(|content| serde_json::from_str::<PluginManifest>(content).map_err(|error| error.to_string()));

    let manifest = match manifest {
        Ok(value) => value,
        Err(error) => {
            return PluginAudit {
                id: "invalid".into(),
                name: "Plugin inválido".into(),
                version: "-".into(),
                description: "No se pudo leer el manifiesto".into(),
                author: "-".into(),
                directory: directory.to_string_lossy().into_owned(),
                entry: "-".into(),
                permissions: vec![],
                signature_status: "invalid".into(),
                trusted: false,
                runnable: false,
                issues: vec![error],
            };
        }
    };

    if manifest.schema_version != 1 {
        issues.push("Versión de esquema no compatible".into());
    }
    if !validate_identifier(&manifest.id) {
        issues.push("El id debe usar minúsculas, números, puntos o guiones".into());
    }
    if manifest.name.trim().is_empty() {
        issues.push("Falta el nombre del plugin".into());
    }
    if manifest.entry.contains("..") || Path::new(&manifest.entry).is_absolute() {
        issues.push("La entrada del plugin debe ser una ruta relativa segura".into());
    }
    if manifest.permissions.len() > 20 {
        issues.push("El plugin declara demasiados permisos".into());
    }
    for permission in &manifest.permissions {
        if !validate_identifier(&permission.id) {
            issues.push(format!("Permiso inválido: {}", permission.id));
        }
        if permission.reason.trim().is_empty() {
            issues.push(format!("El permiso {} necesita una justificación", permission.id));
        }
    }

    let signature_result = verify_signature(&manifest, trusted_publishers);
    let (signature_status, trusted) = match signature_result {
        Ok(true) => ("trusted".to_string(), true),
        Ok(false) => ("invalid".to_string(), false),
        Err(error) if error == "unsigned" => ("unsigned".to_string(), false),
        Err(error) => {
            issues.push(error);
            ("untrusted".to_string(), false)
        }
    };

    let runnable = trusted && issues.is_empty();
    PluginAudit {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        directory: directory.to_string_lossy().into_owned(),
        entry: manifest.entry,
        permissions: manifest.permissions,
        signature_status,
        trusted,
        runnable,
        issues,
    }
}

#[tauri::command]
pub fn plugin_system_status(app: tauri::AppHandle) -> Result<PluginSystemStatus, String> {
    let directory = plugins_directory(&app)?;
    let trusted_publishers = trusted_publishers(&directory);
    Ok(PluginSystemStatus {
        plugins_directory: directory.to_string_lossy().into_owned(),
        trusted_publishers: trusted_publishers.len(),
        policy: "Los plugins sin firma confiable se listan, pero quedan bloqueados. Las llaves confiables viven en trusted-publishers.json.".into(),
    })
}

#[tauri::command]
pub fn scan_local_plugins(app: tauri::AppHandle) -> Result<Vec<PluginAudit>, String> {
    let directory = plugins_directory(&app)?;
    let trusted_publishers = trusted_publishers(&directory);
    let mut plugins = Vec::new();
    for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry.file_type().map_err(|error| error.to_string())?.is_dir() {
            continue;
        }
        let plugin_directory = entry.path();
        let manifest_path = plugin_directory.join(MANIFEST_FILE);
        if manifest_path.is_file() {
            plugins.push(audit_manifest(&plugin_directory, &manifest_path, &trusted_publishers));
        }
    }
    plugins.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(plugins)
}
