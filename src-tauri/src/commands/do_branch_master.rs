use std::path::Path;

use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(serde::Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn preview_do_branch_master(xlsx_path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || run_python(&xlsx_path))
        .await
        .map_err(|error| format!("ระบบอ่าน Master สาขาหยุดทำงาน: {}", error))?
}

fn run_python(xlsx_path: &str) -> Result<Value, String> {
    if !Path::new(xlsx_path).is_file() {
        return Err(format!("ไม่พบไฟล์ Master: {}", xlsx_path));
    }
    let output = engine_command("do-branch-master", "do_branch_master_cli.py")?
        .arg("--xlsx").arg(xlsx_path).output()
        .map_err(|error| format!("เปิดระบบอ่าน Master ไม่สำเร็จ: {}", error))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };
    let response: PythonResponse = serde_json::from_str(&response_text)
        .map_err(|error| format!("อ่านผลลัพธ์ Master ไม่สำเร็จ: {}\n{}", error, response_text))?;
    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| "อ่าน Master สาขาไม่สำเร็จ".to_string()));
    }
    response.data.ok_or_else(|| "ระบบไม่ได้ส่งข้อมูล Master กลับมา".to_string())
}
