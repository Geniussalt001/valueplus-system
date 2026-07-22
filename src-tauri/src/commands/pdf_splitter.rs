use std::{
    io::{
        BufRead,
        BufReader,
        Read,
    },
    path::Path,
    process::Stdio,
};

use serde::Deserialize;
use serde_json::Value;
use tauri::{
    AppHandle,
    Emitter,
};

use crate::python_engine::engine_command;

#[derive(
    Debug,
    Deserialize,
)]
#[serde(
    rename_all = "camelCase"
)]
pub struct SplitPoInput {
    pdf_path: String,
    output_base: String,
}

#[tauri::command]
pub async fn split_po_pdf(
    app: AppHandle,
    input: SplitPoInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            validate_input(
                &input,
            )?;

            run_python(
                &app,
                &input,
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบแยกไฟล์หยุดทำงาน: {}",
            error,
        )
    })?
}

fn validate_input(
    input: &SplitPoInput,
) -> Result<(), String> {
    let pdf_path =
        Path::new(
            input.pdf_path.trim(),
        );

    if !pdf_path.is_file() {
        return Err(
            format!(
                "ไม่พบไฟล์ PDF: {}",
                pdf_path.display(),
            ),
        );
    }

    let is_pdf = pdf_path
        .extension()
        .and_then(|value| {
            value.to_str()
        })
        .is_some_and(|value| {
            value.eq_ignore_ascii_case(
                "pdf",
            )
        });

    if !is_pdf {
        return Err(
            "กรุณาเลือกไฟล์ PDF เท่านั้น"
                .to_string(),
        );
    }

    if input.output_base.trim().is_empty() {
        return Err(
            "ไม่พบตำแหน่งบันทึกไฟล์"
                .to_string(),
        );
    }

    Ok(())
}

fn run_python(
    app: &AppHandle,
    input: &SplitPoInput,
) -> Result<Value, String> {
    let mut command = engine_command(
        "split-po",
        "split_po_cli.py",
    )?;

    command
        .arg(
            "--pdf",
        )
        .arg(
            &input.pdf_path,
        )
        .arg(
            "--output-base",
        )
        .arg(
            &input.output_base,
        )
        .stdout(
            Stdio::piped(),
        )
        .stderr(
            Stdio::piped(),
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

    let mut child = command
        .spawn()
        .map_err(|error| {
            format!(
                "ไม่สามารถเปิด Python Engine ได้: {}",
                error,
            )
        })?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| {
            "ไม่สามารถอ่าน LOG จาก Python ได้"
                .to_string()
        })?;

    let mut final_result:
        Option<Value> = None;

    for line_result in
        BufReader::new(stdout).lines()
    {
        let line = line_result
            .map_err(|error| {
                format!(
                    "อ่าน LOG จาก Python ไม่สำเร็จ: {}",
                    error,
                )
            })?;

        let trimmed = line.trim();

        if trimmed.is_empty() {
            continue;
        }

        let payload: Value =
            serde_json::from_str(
                trimmed,
            )
            .map_err(|error| {
                format!(
                    "อ่านข้อมูลจาก Python ไม่สำเร็จ: {}\n{}",
                    error,
                    trimmed,
                )
            })?;

        if payload
            .get("type")
            .and_then(Value::as_str)
            == Some("log")
        {
            let _ = app.emit(
                "po-split-log",
                payload.clone(),
            );
        }

        if payload
            .get("type")
            .and_then(Value::as_str)
            == Some("result")
        {
            final_result = Some(
                payload,
            );
        }
    }

    let mut stderr = String::new();

    if let Some(
        mut error_stream,
    ) = child.stderr.take()
    {
        let _ = error_stream
            .read_to_string(
                &mut stderr,
            );
    }

    let status = child
        .wait()
        .map_err(|error| {
            format!(
                "รอผลลัพธ์จาก Python ไม่สำเร็จ: {}",
                error,
            )
        })?;

    let response = final_result
        .ok_or_else(|| {
            if stderr.trim().is_empty() {
                "Python ไม่ได้ส่งผลลัพธ์กลับมา"
                    .to_string()
            } else {
                format!(
                    "Python ไม่ได้ส่งผลลัพธ์กลับมา: {}",
                    stderr.trim(),
                )
            }
        })?;

    let success = response
        .get("success")
        .and_then(Value::as_bool)
        .unwrap_or(false);

    if !status.success() || !success {
        return Err(
            response
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or(
                    "แยกและเปลี่ยนชื่อ PO ไม่สำเร็จ",
                )
                .to_string(),
        );
    }

    response
        .get("data")
        .cloned()
        .ok_or_else(|| {
            "Python ไม่ได้ส่งข้อมูลผลลัพธ์กลับมา"
                .to_string()
        })
}
