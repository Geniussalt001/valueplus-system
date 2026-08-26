use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoDeliveryInput {
    pdf_paths: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn preview_do_delivery(input: DoDeliveryInput) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || run_python(&input))
        .await
        .map_err(|error| format!("ระบบวิเคราะห์ DO หยุดทำงาน: {}", error))?
}

fn run_python(input: &DoDeliveryInput) -> Result<Value, String> {
    if input.pdf_paths.is_empty() {
        return Err("กรุณาเลือกไฟล์ DO อย่างน้อย 1 ไฟล์".to_string());
    }
    let mut command = engine_command("do-delivery", "do_delivery_cli.py")?;
    for pdf_path in &input.pdf_paths {
        if !Path::new(pdf_path).is_file() {
            return Err(format!("ไม่พบไฟล์ DO: {}", pdf_path));
        }
        command.arg("--file").arg(pdf_path);
    }
    let output = command.output().map_err(|error| format!("เปิดระบบวิเคราะห์ DO ไม่สำเร็จ: {}", error))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };
    let response: PythonResponse = serde_json::from_str(&response_text)
        .map_err(|error| format!("อ่านผลลัพธ์ DO ไม่สำเร็จ: {}\n{}", error, response_text))?;
    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| "ประมวลผล DO ไม่สำเร็จ".to_string()));
    }
    response.data.ok_or_else(|| "ระบบไม่ได้ส่งข้อมูล DO กลับมา".to_string())
}
