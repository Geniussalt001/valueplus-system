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
pub struct PoProcessorInput {
    pdf_path: String,
    template_path: String,
    start_iv: String,
    output_path: Option<String>,
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
pub fn preview_po_documents(
    input: PoProcessorInput,
) -> Result<Value, String> {
    validate_input(
        &input,
        false,
    )?;

    run_python(
        &input,
        true,
    )
}

#[tauri::command]
pub fn process_po_documents(
    input: PoProcessorInput,
) -> Result<Value, String> {
    validate_input(
        &input,
        true,
    )?;

    run_python(
        &input,
        false,
    )
}

fn validate_input(
    input: &PoProcessorInput,
    require_output: bool,
) -> Result<(), String> {
    validate_file(
        &input.pdf_path,
        "ไม่พบไฟล์ PDF",
    )?;

    validate_file(
        &input.template_path,
        "ไม่พบไฟล์ Excel Template",
    )?;

    let iv_number = input
        .start_iv
        .trim()
        .trim_start_matches(
            "VPR",
        );

    if iv_number.is_empty()
        || !iv_number
            .chars()
            .all(|character| {
                character
                    .is_ascii_digit()
            })
    {
        return Err(
            "เลข IV ต้องเป็นตัวเลขเท่านั้น"
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

fn validate_file(
    path: &str,
    error_message: &str,
) -> Result<(), String> {
    if !Path::new(path).is_file() {
        return Err(
            format!(
                "{}: {}",
                error_message,
                path,
            ),
        );
    }

    Ok(())
}

fn run_python(
    input: &PoProcessorInput,
    preview_only: bool,
) -> Result<Value, String> {
    let mut command = engine_command(
        "po",
        "cli.py",
    )?;

    command
        .arg(
            "--pdf",
        )
        .arg(
            &input.pdf_path,
        )
        .arg(
            "--template",
        )
        .arg(
            &input.template_path,
        )
        .arg(
            "--start-iv",
        )
        .arg(
            &input.start_iv,
        );

    if preview_only {
        command.arg(
            "--preview",
        );
    } else {
        let output_path = input
            .output_path
            .as_ref()
            .ok_or_else(|| {
                "ไม่พบตำแหน่งบันทึกไฟล์"
                    .to_string()
            })?;

        command
            .arg(
                "--output",
            )
            .arg(
                output_path,
            );
    }

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
                "ไม่สามารถเปิด Python Engine ได้: {}",
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
            "Python ไม่ได้ส่งข้อมูลกลับมา"
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
                "อ่านผลลัพธ์จาก Python ไม่สำเร็จ: {}\n{}",
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
                    "ประมวลผลเอกสารไม่สำเร็จ"
                        .to_string()
                }),
        );
    }

    response
        .data
        .ok_or_else(|| {
            "Python ไม่ได้ส่งข้อมูล Preview กลับมา"
                .to_string()
        })
}
