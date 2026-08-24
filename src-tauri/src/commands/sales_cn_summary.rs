use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalesCnSummaryInput {
    source_path: String,
    report_path: String,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn process_sales_cn_summary(input: SalesCnSummaryInput) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_input(&input)?;
        run_python(&input)
    })
    .await
    .map_err(|error| format!("ระบบสรุปยอดขายและ CN หยุดทำงาน: {}", error))?
}

fn validate_input(input: &SalesCnSummaryInput) -> Result<(), String> {
    let source_path = Path::new(input.source_path.trim());
    if !source_path.is_file() {
        return Err(format!("ไม่พบไฟล์ Excel: {}", source_path.display()));
    }

    let is_xlsx = source_path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("xlsx"));
    if !is_xlsx {
        return Err("กรุณาเลือกไฟล์ Excel .xlsx เท่านั้น".to_string());
    }

    let report_path = Path::new(input.report_path.trim());
    let report_is_xlsx = report_path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("xlsx"));
    if !report_is_xlsx {
        return Err("ตำแหน่งไฟล์รายงานหลักไม่ถูกต้อง".to_string());
    }

    Ok(())
}

fn run_python(input: &SalesCnSummaryInput) -> Result<Value, String> {
    let mut command = engine_command("sales-cn-summary", "sales_cn_summary_cli.py")?;
    command
        .arg("--source")
        .arg(&input.source_path)
        .arg("--report")
        .arg(&input.report_path);

    let output = command.output().map_err(|error| {
        format!("ไม่สามารถเปิด Sales/CN Summary Engine ได้: {}", error)
    })?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };

    if response_text.is_empty() {
        return Err("Python ไม่ได้ส่งผลการอัปเดตรายงานกลับมา".to_string());
    }

    let response: PythonResponse = serde_json::from_str(&response_text).map_err(|error| {
        format!("อ่านผลลัพธ์สรุปยอดไม่สำเร็จ: {}\n{}", error, response_text)
    })?;

    if !output.status.success() || !response.success {
        return Err(response
            .message
            .unwrap_or_else(|| "อัปเดตรายงานยอดขายและ CN ไม่สำเร็จ".to_string()));
    }

    response
        .data
        .ok_or_else(|| "Python ไม่ได้ส่งข้อมูลสรุปยอดกลับมา".to_string())
}
