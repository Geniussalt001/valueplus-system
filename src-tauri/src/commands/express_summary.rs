use std::path::Path;

use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(
    Debug,
    Deserialize,
)]
#[serde(
    rename_all = "camelCase"
)]
pub struct ExpressSummaryInput {
    csv_path: String,
    catalog_path: String,
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
pub async fn process_express_summary(
    input: ExpressSummaryInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            validate_input(
                &input,
            )?;

            run_python(
                &input,
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบสรุปยอด Express หยุดทำงาน: {}",
            error,
        )
    })?
}

fn validate_input(
    input: &ExpressSummaryInput,
) -> Result<(), String> {
    let csv_path =
        Path::new(
            input.csv_path.trim(),
        );

    if !csv_path.is_file() {
        return Err(
            format!(
                "ไม่พบไฟล์ CSV: {}",
                csv_path.display(),
            ),
        );
    }

    let is_csv = csv_path
        .extension()
        .and_then(|value| {
            value.to_str()
        })
        .is_some_and(|value| {
            value.eq_ignore_ascii_case(
                "csv",
            )
        });

    if !is_csv {
        return Err(
            "กรุณาเลือกไฟล์ CSV เท่านั้น"
                .to_string(),
        );
    }

    if input.catalog_path.trim().is_empty() {
        return Err(
            "ไม่พบตำแหน่งฐานข้อมูลสินค้า"
                .to_string(),
        );
    }

    Ok(())
}

fn run_python(
    input: &ExpressSummaryInput,
) -> Result<Value, String> {
    let mut command = engine_command(
        "express-summary",
        "express_summary_cli.py",
    )?;

    command
        .arg(
            "--csv",
        )
        .arg(
            &input.csv_path,
        )
        .arg(
            "--database",
        )
        .arg(
            &input.catalog_path,
        );

    #[cfg(
        target_os = "windows"
    )]
    {
        use std::os::windows::process::CommandExt;

        command.creation_flags(
            0x08000000,
        );
    }

    let output = command
        .output()
        .map_err(|error| {
            format!(
                "ไม่สามารถเปิด Express Summary Engine ได้: {}",
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
            "Python ไม่ได้ส่งข้อมูลสรุปยอดกลับมา"
                .to_string(),
        );
    }

    let response:
        PythonResponse =
        serde_json::from_str(
            &response_text,
        )
        .map_err(|error| {
            format!(
                "อ่านผลลัพธ์สรุปยอดไม่สำเร็จ: {}\n{}",
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
                    "ประมวลผลสรุปยอด Express ไม่สำเร็จ"
                        .to_string()
                }),
        );
    }

    response
        .data
        .ok_or_else(|| {
            "Python ไม่ได้ส่งข้อมูลสรุปยอดกลับมา"
                .to_string()
        })
}
