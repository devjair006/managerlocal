use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

pub fn command(program: &str) -> Command {
    let mut command = Command::new(program);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    command
}

pub fn candidate_command(candidates: &[&str]) -> Command {
    if let Some(path) = find_binary(candidates) {
        command(path.to_string_lossy().as_ref())
    } else {
        command(candidates.first().copied().unwrap_or_default())
    }
}

pub fn find_binary(candidates: &[&str]) -> Option<PathBuf> {
    for directory in search_directories() {
        for candidate in candidates {
            let path = directory.join(candidate);
            if is_executable_file(&path) {
                return Some(path);
            }
            #[cfg(target_os = "windows")]
            {
                for extension in ["exe", "cmd", "bat"] {
                    let with_extension = directory.join(format!("{candidate}.{extension}"));
                    if is_executable_file(&with_extension) {
                        return Some(with_extension);
                    }
                }
            }
        }
    }
    candidates.iter().find_map(|candidate| command(candidate).output().ok().map(|_| PathBuf::from(candidate)))
}

pub fn probe(candidates: &[&str], version_args: &[&str]) -> (bool, Option<String>, Option<String>) {
    for candidate in candidates {
        let mut names = vec![*candidate];
        let owned;
        #[cfg(target_os = "windows")]
        {
            owned = if candidate.ends_with(".exe") || candidate.ends_with(".cmd") || candidate.ends_with(".bat") {
                None
            } else {
                Some(format!("{candidate}.exe"))
            };
            if let Some(value) = owned.as_deref() {
                names.push(value);
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = &names;
        }

        for name in names {
            let Some(path) = find_binary(&[name]) else { continue; };
            let output = command(path.to_string_lossy().as_ref()).args(version_args).output();
            if let Ok(output) = output {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let text = if stdout.is_empty() { stderr } else { stdout };
                if output.status.success() || !text.is_empty() {
                    return (true, Some(path.to_string_lossy().into_owned()), text.lines().next().map(|line| line.to_string()));
                }
            }
        }
    }
    (false, None, None)
}

pub fn data_directory(name: &str) -> Option<PathBuf> {
    search_directories()
        .into_iter()
        .map(|directory| directory.join(name))
        .find(|directory| directory.is_dir())
}

pub fn user_binaries_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            return PathBuf::from(local_app_data).join("Manager Local").join("binaries");
        }
        if let Ok(app_data) = env::var("APPDATA") {
            return PathBuf::from(app_data).join("Manager Local").join("binaries");
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = env::var("HOME") {
            return PathBuf::from(home).join("Library").join("Application Support").join("Manager Local").join("binaries");
        }
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        if let Ok(data_home) = env::var("XDG_DATA_HOME") {
            return PathBuf::from(data_home).join("manager-local").join("binaries");
        }
        if let Ok(home) = env::var("HOME") {
            return PathBuf::from(home).join(".local").join("share").join("manager-local").join("binaries");
        }
    }

    PathBuf::from("manager-local-binaries")
}

fn is_executable_file(path: &Path) -> bool {
    path.is_file()
}

fn search_directories() -> Vec<PathBuf> {
    let mut directories = Vec::new();

    if let Ok(value) = env::var("MANAGERLOCAL_BIN_DIR") {
        directories.push(PathBuf::from(value));
    }

    directories.push(user_binaries_directory());

    if let Ok(exe) = env::current_exe() {
        if let Some(parent) = exe.parent() {
            directories.push(parent.join("binaries"));
            directories.push(parent.join("resources").join("binaries"));
            directories.push(parent.join("..").join("Resources").join("binaries"));
        }
    }

    if let Ok(cwd) = env::current_dir() {
        directories.push(cwd.join("src-tauri").join("binaries"));
        directories.push(cwd.join("binaries"));
    }

    directories
}
