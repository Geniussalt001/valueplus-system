use std::{
    fs::{self, File, OpenOptions},
    io::{BufReader, BufWriter, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

const OUTBOX_DIRECTORY: &str = "apps-script-outbox";
const RESPONSE_CACHE_DIRECTORY: &str = "apps-script-cache";
const OUTBOX_VERSION: u8 = 2;
const MAX_RESPONSE_CACHE_BYTES: u64 = 512 * 1024 * 1024;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppsScriptOutboxRequest {
    pub request_id: String,
    pub action: String,
    pub data: Value,
    pub require_session: bool,
    pub session_user_code: String,
    #[serde(default = "default_apps_script_transport")]
    pub transport: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppsScriptOutboxEntry {
    pub version: u8,
    pub request_id: String,
    pub action: String,
    pub data: Value,
    pub require_session: bool,
    pub session_user_code: String,
    #[serde(default = "default_apps_script_transport")]
    pub transport: String,
    pub created_at_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppsScriptOutboxSummary {
    pub request_id: String,
    pub action: String,
    pub require_session: bool,
    pub session_user_code: String,
    pub transport: String,
    pub created_at_ms: u64,
    pub size_bytes: u64,
}

#[tauri::command]
pub fn enqueue_apps_script_outbox(
    app: AppHandle,
    request: AppsScriptOutboxRequest,
) -> Result<AppsScriptOutboxSummary, String> {
    let request_id =
        validate_request_id(&request.request_id)?;
    let action = request.action.trim().to_string();

    if action.is_empty() {
        return Err("ไม่พบชื่อคำสั่งสำหรับคิวซิงก์".to_string());
    }

    let directory = outbox_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| {
        format!("สร้างแฟ้มคิวซิงก์ไม่สำเร็จ: {error}")
    })?;

    let destination = entry_path(&directory, &request_id);

    if destination.exists() {
        return read_summary(&destination);
    }

    let transport = validate_transport(&request.transport)?;

    let entry = AppsScriptOutboxEntry {
        version: OUTBOX_VERSION,
        request_id: request_id.clone(),
        action,
        data: request.data,
        require_session: request.require_session,
        session_user_code: request.session_user_code.trim().to_uppercase(),
        transport,
        created_at_ms: current_time_ms()?,
    };

    let temporary = directory.join(format!("{request_id}.tmp"));
    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|error| {
            format!("สร้างรายการรอซิงก์ไม่สำเร็จ: {error}")
        })?;

    let write_result = (|| -> Result<(), String> {
        let mut writer = BufWriter::new(file);
        serde_json::to_writer(&mut writer, &entry).map_err(|error| {
            format!("จัดเก็บข้อมูลรอซิงก์ไม่สำเร็จ: {error}")
        })?;
        writer.flush().map_err(|error| {
            format!("บันทึกข้อมูลรอซิงก์ไม่สำเร็จ: {error}")
        })?;
        writer.get_ref().sync_all().map_err(|error| {
            format!("ยืนยันข้อมูลรอซิงก์ไม่สำเร็จ: {error}")
        })
    })();

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }

    if let Err(error) = fs::rename(&temporary, &destination) {
        let _ = fs::remove_file(&temporary);

        if destination.exists() {
            return read_summary(&destination);
        }

        return Err(format!("ย้ายรายการเข้าคิวซิงก์ไม่สำเร็จ: {error}"));
    }

    read_summary(&destination)
}

#[tauri::command]
pub fn list_apps_script_outbox(
    app: AppHandle,
) -> Result<Vec<AppsScriptOutboxSummary>, String> {
    let directory = outbox_directory(&app)?;

    if !directory.exists() {
        return Ok(Vec::new());
    }

    recover_outbox_temporary_files(&directory);

    let mut entries = fs::read_dir(&directory)
        .map_err(|error| format!("อ่านแฟ้มคิวซิงก์ไม่สำเร็จ: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("json"))
        })
        .filter_map(|path| read_summary(&path).ok())
        .collect::<Vec<_>>();

    entries.sort_by_key(|entry| entry.created_at_ms);
    Ok(entries)
}

#[tauri::command]
pub fn read_apps_script_outbox(
    app: AppHandle,
    request_id: String,
) -> Result<AppsScriptOutboxEntry, String> {
    let request_id = validate_request_id(&request_id)?;
    let directory = outbox_directory(&app)?;
    read_entry(&entry_path(&directory, &request_id))
}

#[tauri::command]
pub fn remove_apps_script_outbox(
    app: AppHandle,
    request_id: String,
) -> Result<(), String> {
    let request_id = validate_request_id(&request_id)?;
    let directory = outbox_directory(&app)?;
    let path = entry_path(&directory, &request_id);

    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("นำรายการออกจากคิวซิงก์ไม่สำเร็จ: {error}")),
    }
}

#[tauri::command]
pub fn write_apps_script_cache(
    app: AppHandle,
    cache_key: String,
    data: Value,
) -> Result<(), String> {
    let cache_key = validate_cache_key(&cache_key)?;
    let directory = response_cache_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| {
        format!("สร้างแฟ้มแคชไม่สำเร็จ: {error}")
    })?;

    let destination = directory.join(format!("{cache_key}.json"));
    let temporary = directory.join(format!("{cache_key}.tmp"));
    let file = File::create(&temporary)
        .map_err(|error| format!("สร้างไฟล์แคชไม่สำเร็จ: {error}"))?;

    let write_result = (|| -> Result<(), String> {
        let mut writer = BufWriter::new(file);
        serde_json::to_writer(&mut writer, &data)
            .map_err(|error| format!("จัดเก็บข้อมูลแคชไม่สำเร็จ: {error}"))?;
        writer.flush()
            .map_err(|error| format!("บันทึกข้อมูลแคชไม่สำเร็จ: {error}"))?;
        writer
            .get_ref()
            .sync_all()
            .map_err(|error| format!("ยืนยันข้อมูลแคชไม่สำเร็จ: {error}"))
    })();

    if let Err(error) = write_result {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }

    if destination.exists() {
        fs::remove_file(&destination)
            .map_err(|error| format!("แทนที่ข้อมูลแคชเดิมไม่สำเร็จ: {error}"))?;
    }

    fs::rename(&temporary, &destination)
        .map_err(|error| format!("ย้ายข้อมูลเข้าแคชไม่สำเร็จ: {error}"))?;

    trim_response_cache(&directory);
    Ok(())
}

#[tauri::command]
pub fn read_apps_script_cache(
    app: AppHandle,
    cache_key: String,
) -> Result<Option<Value>, String> {
    let cache_key = validate_cache_key(&cache_key)?;
    let directory = response_cache_directory(&app)?;
    let path = directory.join(format!("{cache_key}.json"));

    if !path.exists() {
        return Ok(None);
    }

    let file = File::open(path)
        .map_err(|error| format!("เปิดข้อมูลแคชไม่สำเร็จ: {error}"))?;
    let data = serde_json::from_reader(BufReader::new(file))
        .map_err(|error| format!("อ่านข้อมูลแคชไม่สำเร็จ: {error}"))?;

    Ok(Some(data))
}

fn outbox_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join(OUTBOX_DIRECTORY))
        .map_err(|error| format!("หาแฟ้มข้อมูลโปรแกรมไม่สำเร็จ: {error}"))
}

fn response_cache_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join(RESPONSE_CACHE_DIRECTORY))
        .map_err(|error| format!("หาแฟ้มข้อมูลโปรแกรมไม่สำเร็จ: {error}"))
}

fn entry_path(directory: &Path, request_id: &str) -> PathBuf {
    directory.join(format!("{request_id}.json"))
}

fn read_entry(path: &Path) -> Result<AppsScriptOutboxEntry, String> {
    let file = File::open(path)
        .map_err(|error| format!("เปิดรายการรอซิงก์ไม่สำเร็จ: {error}"))?;

    serde_json::from_reader(BufReader::new(file))
        .map_err(|error| format!("อ่านรายการรอซิงก์ไม่สำเร็จ: {error}"))
}

fn read_summary(path: &Path) -> Result<AppsScriptOutboxSummary, String> {
    let entry = read_entry(path)?;
    let size_bytes = fs::metadata(path)
        .map(|metadata| metadata.len())
        .unwrap_or(0);

    Ok(AppsScriptOutboxSummary {
        request_id: entry.request_id,
        action: entry.action,
        require_session: entry.require_session,
        session_user_code: entry.session_user_code,
        transport: validate_transport(&entry.transport)?,
        created_at_ms: entry.created_at_ms,
        size_bytes,
    })
}

fn validate_request_id(value: &str) -> Result<String, String> {
    let normalized = value.trim();

    if normalized.is_empty()
        || normalized.len() > 120
        || !normalized
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("รหัสคำขอสำหรับคิวซิงก์ไม่ถูกต้อง".to_string());
    }

    Ok(normalized.to_string())
}

fn validate_cache_key(value: &str) -> Result<String, String> {
    let normalized = value.trim();

    if normalized.is_empty()
        || normalized.len() > 128
        || !normalized
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("รหัสข้อมูลแคชไม่ถูกต้อง".to_string());
    }

    Ok(normalized.to_string())
}

fn default_apps_script_transport() -> String {
    "apps-script".to_string()
}

fn validate_transport(value: &str) -> Result<String, String> {
    let normalized = value.trim().to_lowercase();

    match normalized.as_str() {
        "apps-script" => Ok(normalized),
        _ => Err("ปลายทางของคิวซิงก์ไม่ถูกต้อง".to_string()),
    }
}

fn trim_response_cache(directory: &Path) {
    let Ok(read_dir) = fs::read_dir(directory) else {
        return;
    };

    let mut files = read_dir
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("json"))
        })
        .filter_map(|path| {
            let metadata = fs::metadata(&path).ok()?;
            let modified = metadata.modified().unwrap_or(UNIX_EPOCH);
            Some((path, metadata.len(), modified))
        })
        .collect::<Vec<_>>();

    let mut total_bytes = files.iter().map(|(_, size, _)| *size).sum::<u64>();

    if total_bytes <= MAX_RESPONSE_CACHE_BYTES {
        return;
    }

    files.sort_by_key(|(_, _, modified)| *modified);

    for (path, size, _) in files {
        if total_bytes <= MAX_RESPONSE_CACHE_BYTES {
            break;
        }

        if fs::remove_file(path).is_ok() {
            total_bytes = total_bytes.saturating_sub(size);
        }
    }
}

fn recover_outbox_temporary_files(directory: &Path) {
    let Ok(read_dir) = fs::read_dir(directory) else {
        return;
    };

    for temporary in read_dir
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("tmp"))
        })
    {
        let Ok(entry) = read_entry(&temporary) else {
            let _ = fs::remove_file(&temporary);
            continue;
        };

        let Ok(request_id) = validate_request_id(&entry.request_id) else {
            let _ = fs::remove_file(&temporary);
            continue;
        };

        let destination = entry_path(directory, &request_id);

        if destination.exists() {
            let _ = fs::remove_file(&temporary);
        } else {
            let _ = fs::rename(&temporary, destination);
        }
    }
}

fn current_time_ms() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .map_err(|error| format!("อ่านเวลาระบบไม่สำเร็จ: {error}"))
}

#[cfg(test)]
mod tests {
    use super::validate_request_id;

    #[test]
    fn accepts_uuid_request_ids() {
        assert!(validate_request_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
    }

    #[test]
    fn rejects_path_traversal_request_ids() {
        assert!(validate_request_id("../outside").is_err());
        assert!(validate_request_id("folder/request").is_err());
    }

    #[test]
    fn validates_response_cache_keys() {
        assert!(super::validate_cache_key("a94f-cache-key").is_ok());
        assert!(super::validate_cache_key("../cache").is_err());
    }

    #[test]
    fn accepts_only_known_sync_transports() {
        assert!(super::validate_transport("apps-script").is_ok());
        assert!(super::validate_transport("unknown").is_err());
    }
}
