use std::{
    path::{Path, PathBuf},
    process::Command,
};

const ENGINE_FILE_NAME: &str = "valueplus-engine.exe";

pub(crate) fn engine_command(
    engine_action: &str,
    development_script: &str,
) -> Result<Command, String> {
    if let Some(engine_path) = find_bundled_engine() {
        let mut command = Command::new(engine_path);
        command.arg(engine_action);
        configure_command(&mut command);
        return Ok(command);
    }

    let project_path = find_development_project()?;
    let python_folder = project_path.join("python");
    let script_path = python_folder.join(development_script);

    if !script_path.is_file() {
        return Err(format!(
            "ไม่พบ Python Engine สำหรับโหมดพัฒนา: {}",
            script_path.display(),
        ));
    }

    let mut command = Command::new(python_executable(&project_path));
    command
        .current_dir(&project_path)
        .env("PYTHONPATH", &python_folder)
        .arg(script_path);
    configure_command(&mut command);
    Ok(command)
}

fn configure_command(command: &mut Command) {
    command
        .env("PYTHONUTF8", "1")
        .env("PYTHONIOENCODING", "utf-8");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
}

fn find_bundled_engine() -> Option<PathBuf> {
    if let Ok(configured_path) = std::env::var("VALUEPLUS_ENGINE_PATH") {
        let path = PathBuf::from(configured_path.trim());
        if path.is_file() {
            return Some(path);
        }
    }

    let executable_folder = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))?;

    [
        executable_folder.join(ENGINE_FILE_NAME),
        executable_folder.join("binaries").join(ENGINE_FILE_NAME),
        executable_folder.join("resources").join("binaries").join(ENGINE_FILE_NAME),
    ]
    .into_iter()
    .find(|path| path.is_file())
}

fn find_development_project() -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(configured_path) = std::env::var("VALUEPLUS_PROJECT_PATH") {
        let configured_path = configured_path.trim();
        if !configured_path.is_empty() {
            candidates.push(PathBuf::from(configured_path));
        }
    }

    #[cfg(target_os = "windows")]
    candidates.push(PathBuf::from(r"D:\valueplus-system"));

    let manifest_folder = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(project_path) = manifest_folder.parent() {
        candidates.push(project_path.to_path_buf());
    }

    if let Ok(current_folder) = std::env::current_dir() {
        candidates.push(current_folder);
    }

    candidates
        .into_iter()
        .find(|path| path.join("python").is_dir())
        .ok_or_else(|| {
            "ไม่พบ ValuePlus Engine ที่ติดตั้งมากับโปรแกรม และไม่พบโฟลเดอร์ Python สำหรับโหมดพัฒนา"
                .to_string()
        })
}

fn python_executable(project_path: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    let virtual_python = project_path
        .join(".venv")
        .join("Scripts")
        .join("python.exe");

    #[cfg(not(target_os = "windows"))]
    let virtual_python = project_path
        .join(".venv")
        .join("bin")
        .join("python");

    if virtual_python.is_file() {
        return virtual_python;
    }

    #[cfg(target_os = "windows")]
    return PathBuf::from("python");

    #[cfg(not(target_os = "windows"))]
    return PathBuf::from("python3");
}
