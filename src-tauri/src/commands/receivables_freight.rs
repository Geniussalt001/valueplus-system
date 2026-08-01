use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

const TEMPLATE_URL: &str =
    "https://docs.google.com/spreadsheets/d/1zU-ALqCOMM2QjehlkKyNj1BPzdCPS-8rBm9iiIdhc9A/export?format=xlsx";

#[derive(
    Debug,
    Deserialize,
)]
#[serde(
    rename_all = "camelCase"
)]
pub struct ReceivablesFreightInput {
    csv_path: String,
    output_path: Option<String>,
    mode: Option<String>,
}

#[derive(
    Debug,
    Deserialize,
)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn preview_receivables_freight(
    input: ReceivablesFreightInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            validate_input(&input, false)?;
            run_python(&input, true)
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบ Preview ลูกหนี้–ค่าขนส่งหยุดทำงาน: {}",
            error,
        )
    })?
}

#[tauri::command]
pub async fn process_receivables_freight(
    input: ReceivablesFreightInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            validate_input(&input, true)?;
            run_python(&input, false)
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบบันทึกลูกหนี้–ค่าขนส่งหยุดทำงาน: {}",
            error,
        )
    })?
}

fn validate_input(
    input: &ReceivablesFreightInput,
    require_output: bool,
) -> Result<(), String> {
    let csv_path =
        Path::new(input.csv_path.trim());

    if !csv_path.is_file() {
        return Err(format!(
            "ไม่พบไฟล์ CSV: {}",
            csv_path.display(),
        ));
    }

    let valid_extension = csv_path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| {
            value.eq_ignore_ascii_case("csv")
        });

    if !valid_extension {
        return Err(
            "รองรับเฉพาะไฟล์ CSV เท่านั้น"
                .to_string(),
        );
    }

    let mode = input
        .mode
        .as_deref()
        .unwrap_or("receivables");

    if !matches!(
        mode,
        "receivables" | "credit-notes"
    ) {
        return Err(
            "โหมดประมวลผล CSV ไม่ถูกต้อง"
                .to_string(),
        );
    }

    if require_output {
        let output_path = input
            .output_path
            .as_deref()
            .unwrap_or("")
            .trim();

        if output_path.is_empty() {
            return Err(
                "กรุณาระบุไฟล์ Excel ผลลัพธ์"
                    .to_string(),
            );
        }
    }

    Ok(())
}

fn run_python(
    input: &ReceivablesFreightInput,
    preview_only: bool,
) -> Result<Value, String> {
    let mut command = engine_command(
        "receivables-freight",
        "receivables_freight_cli.py",
    )?;

    command
        .arg("--csv")
        .arg(&input.csv_path)
        .arg("--template-url")
        .arg(TEMPLATE_URL)
        .arg("--mode")
        .arg(
            input
                .mode
                .as_deref()
                .unwrap_or(
                    "receivables",
                ),
        );

    if preview_only {
        command.arg("--preview");
    } else {
        command
            .arg("--output")
            .arg(
                input
                    .output_path
                    .as_deref()
                    .unwrap_or(""),
            );
    }

    let output = command
        .output()
        .map_err(|error| {
            format!(
                "ไม่สามารถเปิดระบบประมวลผลลูกหนี้–ค่าขนส่งได้: {}",
                error,
            )
        })?;

    let stdout =
        String::from_utf8_lossy(
            &output.stdout,
        )
        .trim()
        .to_string();

    let stderr =
        String::from_utf8_lossy(
            &output.stderr,
        )
        .trim()
        .to_string();

    let response_text =
        if stdout.is_empty() {
            stderr
        } else {
            stdout
        };

    if response_text.is_empty() {
        return Err(
            "ระบบประมวลผลไม่ได้ส่งข้อมูลกลับมา"
                .to_string(),
        );
    }

    let response: PythonResponse =
        serde_json::from_str(
            &response_text,
        )
        .map_err(|error| {
            format!(
                "อ่านผลลัพธ์ไม่สำเร็จ: {}\n{}",
                error,
                response_text,
            )
        })?;

    if !output.status.success()
        || !response.success
    {
        return Err(
            response
                .message
                .unwrap_or_else(|| {
                    "ประมวลผลลูกหนี้–ค่าขนส่งไม่สำเร็จ"
                        .to_string()
                }),
        );
    }

    response.data.ok_or_else(|| {
        "ระบบประมวลผลไม่ได้ส่ง Preview กลับมา"
            .to_string()
    })
}
