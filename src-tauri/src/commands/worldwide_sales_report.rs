use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldwideSalesReportInput {
    output_path: String,
    payload: Value,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn update_worldwide_sales_report(input: WorldwideSalesReportInput) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || run_python(&input))
        .await
        .map_err(|error| format!("ระบบรายงานยอดขายหยุดทำงาน: {}", error))?
}

fn run_python(input: &WorldwideSalesReportInput) -> Result<Value, String> {
    let output_path = input.output_path.trim();
    if output_path.is_empty() {
        return Err("ไม่พบตำแหน่งบันทึกไฟล์ Excel".to_string());
    }
    if let Some(parent) = Path::new(output_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("สร้างโฟลเดอร์รายงานยอดขายไม่สำเร็จ: {}", error))?;
    }
    let payload = serde_json::to_string(&input.payload)
        .map_err(|error| format!("เตรียมข้อมูลรายงานไม่สำเร็จ: {}", error))?;
    let mut command = engine_command("worldwide-sales-report", "worldwide_sales_report_cli.py")?;
    command.arg("--payload").arg(payload).arg("--output").arg(output_path);
    let output = command.output().map_err(|error| format!("เปิดระบบรายงานไม่สำเร็จ: {}", error))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };
    let response: PythonResponse = serde_json::from_str(&response_text)
        .map_err(|error| format!("อ่านผลลัพธ์รายงานไม่สำเร็จ: {}\n{}", error, response_text))?;
    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| "อัปเดตไฟล์ Excel ไม่สำเร็จ".to_string()));
    }
    response.data.ok_or_else(|| "ระบบรายงานไม่ได้ส่งข้อมูลกลับมา".to_string())
}
