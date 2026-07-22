
use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DollSummaryInput {
    database_path: String,
    action: String,
    summary_date: Option<String>,
    quantities: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn manage_doll_summary(
    input: DollSummaryInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_input(&input)?;
        run_python(&input)
    })
    .await
    .map_err(|error| {
        format!("ระบบบันทึกสรุปยอดตุ๊กตาหยุดทำงาน: {}", error)
    })?
}

fn validate_input(
    input: &DollSummaryInput,
) -> Result<(), String> {
    if input.database_path.trim().is_empty() {
        return Err("ไม่พบตำแหน่งฐานข้อมูล".to_string());
    }

    match input.action.as_str() {
        "list" => Ok(()),
        "load" | "save" | "delete" => {
            if input
                .summary_date
                .as_deref()
                .unwrap_or("")
                .trim()
                .is_empty()
            {
                return Err("กรุณาระบุวันที่สรุปยอด".to_string());
            }
            Ok(())
        }
        _ => Err(format!(
            "ไม่รู้จักคำสั่งสรุปยอดตุ๊กตา: {}",
            input.action,
        )),
    }
}

fn run_python(
    input: &DollSummaryInput,
) -> Result<Value, String> {
    let mut command = engine_command(
        "doll-summary",
        "doll_summary_cli.py",
    )?;
    command
        .arg("--database")
        .arg(&input.database_path)
        .arg(&input.action);

    if let Some(summary_date) = &input.summary_date {
        command.arg("--date").arg(summary_date);
    }

    if input.action == "save" {
        let quantities = input
            .quantities
            .clone()
            .unwrap_or_else(|| Value::Object(serde_json::Map::new()));

        command
            .arg("--quantities-json")
            .arg(
                serde_json::to_string(&quantities)
                .map_err(|error| {
                    format!("เตรียมข้อมูลยอดตุ๊กตาไม่สำเร็จ: {}", error)
                })?,
            );
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let output = command.output().map_err(|error| {
        format!("ไม่สามารถเปิด Doll Summary Engine ได้: {}", error)
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();
    let stderr = String::from_utf8_lossy(&output.stderr)
        .trim()
        .to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };

    if response_text.is_empty() {
        return Err("Python ไม่ได้ส่งข้อมูลสรุปยอดกลับมา".to_string());
    }

    let response: PythonResponse =
        serde_json::from_str(&response_text).map_err(|error| {
            format!(
                "อ่านผลลัพธ์ Doll Summary ไม่สำเร็จ: {}\n{}",
                error, response_text,
            )
        })?;

    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| {
            "จัดการสรุปยอดตุ๊กตาไม่สำเร็จ".to_string()
        }));
    }

    response
        .data
        .ok_or_else(|| "Python ไม่ได้ส่งข้อมูลสรุปยอดกลับมา".to_string())
}
