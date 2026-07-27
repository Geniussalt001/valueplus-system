use std::{
    fs,
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::Stdio,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalesBillingPreviewInput {
    pdf_path: String,
    start_iv: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalesBillingRunInput {
    orders: Vec<Value>,
    simulate: bool,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn preview_sales_billing(
    input: SalesBillingPreviewInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let pdf_path = Path::new(input.pdf_path.trim());
        if !pdf_path.is_file() {
            return Err(format!("ไม่พบไฟล์ PDF: {}", pdf_path.display()));
        }
        if !pdf_path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("pdf"))
        {
            return Err("รองรับเฉพาะไฟล์ PDF เท่านั้น".to_string());
        }
        if input.start_iv.trim().is_empty() {
            return Err("กรุณาระบุเลข IV เริ่มต้น".to_string());
        }

        let output = engine_command("sales-billing", "sales_billing_cli.py")?
            .arg("preview")
            .arg("--pdf")
            .arg(pdf_path)
            .arg("--start-iv")
            .arg(input.start_iv.trim())
            .output()
            .map_err(|error| format!("เปิดระบบ Preview ไม่สำเร็จ: {}", error))?;

        let text = if output.stdout.is_empty() {
            String::from_utf8_lossy(&output.stderr).trim().to_string()
        } else {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        };
        let response: PythonResponse = serde_json::from_str(&text)
            .map_err(|error| format!("อ่านผล Preview ไม่สำเร็จ: {}\n{}", error, text))?;

        if !output.status.success() || !response.success {
            return Err(response
                .message
                .unwrap_or_else(|| "ประมวลผลไฟล์ PDF ไม่สำเร็จ".to_string()));
        }
        response
            .data
            .ok_or_else(|| "ระบบไม่ได้ส่งข้อมูล Preview กลับมา".to_string())
    })
    .await
    .map_err(|error| format!("ระบบ Preview หยุดทำงาน: {}", error))?
}

#[tauri::command]
pub async fn run_sales_billing(
    app: AppHandle,
    input: SalesBillingRunInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || run_billing(app, input))
        .await
        .map_err(|error| format!("ระบบเปิดบิลหยุดทำงาน: {}", error))?
}

#[tauri::command]
pub fn control_sales_billing(action: String) -> Result<(), String> {
    let normalized = action.trim().to_uppercase();
    if !matches!(normalized.as_str(), "PAUSE" | "RESUME" | "STOP") {
        return Err("คำสั่งควบคุมไม่ถูกต้อง".to_string());
    }
    fs::write(control_path(), normalized)
        .map_err(|error| format!("ส่งคำสั่งควบคุมไม่สำเร็จ: {}", error))
}

fn run_billing(app: AppHandle, input: SalesBillingRunInput) -> Result<Value, String> {
    if input.orders.is_empty() {
        return Err("กรุณาเลือกอย่างน้อย 1 IV".to_string());
    }

    let request_path = temporary_path("request", "json");
    let control_path = control_path();
    let request = json!({ "orders": input.orders });
    fs::write(
        &request_path,
        serde_json::to_vec(&request)
            .map_err(|error| format!("เตรียมคิวเปิดบิลไม่สำเร็จ: {}", error))?,
    )
    .map_err(|error| format!("สร้างคิวเปิดบิลไม่สำเร็จ: {}", error))?;
    fs::write(&control_path, "")
        .map_err(|error| format!("เตรียมระบบควบคุมไม่สำเร็จ: {}", error))?;

    let result = (|| {
        let mut command = engine_command("sales-billing", "sales_billing_cli.py")?;
        command
            .arg("execute")
            .arg("--request")
            .arg(&request_path)
            .arg("--control")
            .arg(&control_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if input.simulate {
            command.arg("--simulate");
        }

        let mut child = command
            .spawn()
            .map_err(|error| format!("เปิดระบบคีย์ Express ไม่สำเร็จ: {}", error))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "ไม่สามารถอ่านสถานะระบบเปิดบิลได้".to_string())?;
        let stderr_reader = child.stderr.take().map(|stream| {
            std::thread::spawn(move || {
                let mut text = String::new();
                let mut stream = stream;
                let _ = stream.read_to_string(&mut text);
                text
            })
        });

        let mut final_event: Option<Value> = None;
        for line in BufReader::new(stdout).lines() {
            let line = line.map_err(|error| format!("อ่านสถานะไม่สำเร็จ: {}", error))?;
            if line.trim().is_empty() {
                continue;
            }
            let event: Value = serde_json::from_str(&line)
                .map_err(|error| format!("สถานะจาก Python ไม่ถูกต้อง: {}\n{}", error, line))?;
            app.emit("sales-billing-progress", event.clone())
                .map_err(|error| format!("ส่งสถานะไปหน้าจอไม่สำเร็จ: {}", error))?;
            if event.get("type").and_then(Value::as_str) == Some("finished") {
                final_event = Some(event);
            }
        }

        let status = child
            .wait()
            .map_err(|error| format!("รอระบบเปิดบิลไม่สำเร็จ: {}", error))?;
        let stderr = stderr_reader
            .and_then(|reader| reader.join().ok())
            .unwrap_or_default();
        let final_event = final_event.unwrap_or_else(|| {
            json!({
                "type": "finished",
                "success": status.success(),
                "message": if status.success() {
                    "ดำเนินการเสร็จสิ้น"
                } else {
                    "ระบบเปิดบิลหยุดทำงานโดยไม่ส่งรายละเอียด"
                },
            })
        });
        if !status.success()
            && final_event.get("success").and_then(Value::as_bool) != Some(false)
        {
            return Err(if stderr.trim().is_empty() {
                "ระบบเปิดบิลหยุดทำงาน".to_string()
            } else {
                stderr.trim().to_string()
            });
        }
        Ok(final_event)
    })();

    let _ = fs::remove_file(request_path);
    let _ = fs::remove_file(control_path);
    result
}

fn control_path() -> PathBuf {
    std::env::temp_dir().join("valueplus-sales-billing-control.txt")
}

fn temporary_path(label: &str, extension: &str) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    std::env::temp_dir().join(format!(
        "valueplus-sales-billing-{}-{}-{}.{}",
        label,
        std::process::id(),
        timestamp,
        extension,
    ))
}
