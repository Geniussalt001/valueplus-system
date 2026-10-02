use std::{io::Write, process::Stdio, sync::Mutex};
use serde_json::Value;
use tauri::Manager;
use crate::python_engine::engine_command;

static HUB_LOCK: Mutex<()> = Mutex::new(());

#[tauri::command]
pub async fn hub_delivery_command(app: tauri::AppHandle, action: String, payload: Value) -> Result<Value, String> {
    if !["load", "import-source", "settings", "import-template", "reset-template", "export", "open-history"].contains(&action.as_str()) {
        return Err("คำสั่ง HUB ไม่ถูกต้อง".into());
    }
    let folder = app.path().app_data_dir().map_err(|e| e.to_string())?.join("hub-delivery");
    let output_folder = app.path().desktop_dir().map_err(|e| e.to_string())?.join("ValuePlus Delivery Notes");
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = HUB_LOCK.lock().map_err(|e| e.to_string())?;
        let mut command = engine_command("hub-delivery", "hub_delivery_cli.py")?;
        let mut child = command.arg("--action").arg(&action)
            .arg("--data-dir").arg(folder).arg("--output-dir").arg(output_folder)
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
            .spawn().map_err(|e| format!("เปิดระบบ HUB ไม่สำเร็จ: {}", e))?;
        let bytes = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;
        if let Some(mut input) = child.stdin.take() {
            if let Err(error) = input.write_all(&bytes) {
                let _ = child.kill(); let _ = child.wait();
                return Err(format!("ส่งข้อมูล HUB ไม่สำเร็จ: {}", error));
            }
        }
        let output = child.wait_with_output().map_err(|e| e.to_string())?;
        let response: Value = serde_json::from_slice(&output.stdout)
            .map_err(|_| format!("อ่านผลลัพธ์ HUB ไม่สำเร็จ: {}", String::from_utf8_lossy(&output.stderr)))?;
        if !output.status.success() || response["success"] != true {
            return Err(response["message"].as_str().unwrap_or("ระบบ HUB ไม่สำเร็จ").to_string());
        }
        Ok(response["data"].clone())
    }).await.map_err(|e| e.to_string())?
}
