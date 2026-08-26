use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlySalesInput {
    csv_paths: Vec<String>,
    output_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn preview_monthly_sales(input: MonthlySalesInput) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || run_python(&input, true))
        .await
        .map_err(|error| format!("ระบบ Preview ยอดขายรายเดือนหยุดทำงาน: {}", error))?
}

#[tauri::command]
pub async fn process_monthly_sales(input: MonthlySalesInput) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || run_python(&input, false))
        .await
        .map_err(|error| format!("ระบบสรุปยอดขายรายเดือนหยุดทำงาน: {}", error))?
}

fn run_python(input: &MonthlySalesInput, preview: bool) -> Result<Value, String> {
    if input.csv_paths.is_empty() {
        return Err("กรุณาเลือกไฟล์ CSV อย่างน้อย 1 ไฟล์".to_string());
    }
    for csv_path in &input.csv_paths {
        if !Path::new(csv_path).is_file() {
            return Err(format!("ไม่พบไฟล์ CSV: {}", csv_path));
        }
    }

    let mut command = engine_command("monthly-sales", "monthly_sales_cli.py")?;
    for csv_path in &input.csv_paths {
        command.arg("--csv").arg(csv_path);
    }
    if preview {
        command.arg("--preview");
    } else {
        let output = input.output_path.as_deref().unwrap_or("").trim();
        if output.is_empty() {
            return Err("กรุณาระบุไฟล์ Excel ผลลัพธ์".to_string());
        }
        command.arg("--output").arg(output);
    }

    let output = command.output().map_err(|error| format!("เปิดระบบประมวลผลไม่สำเร็จ: {}", error))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };
    let response: PythonResponse = serde_json::from_str(&response_text)
        .map_err(|error| format!("อ่านผลลัพธ์ไม่สำเร็จ: {}\n{}", error, response_text))?;

    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| "ประมวลผลยอดขายรายเดือนไม่สำเร็จ".to_string()));
    }
    response.data.ok_or_else(|| "ระบบไม่ได้ส่งข้อมูลกลับมา".to_string())
}
