use std::{
    path::{
        Path,
        PathBuf,
    },
    process::Command,
};

use serde::Deserialize;
use serde_json::Value;

#[derive(
    Debug,
    Deserialize,
)]
#[serde(
    rename_all = "camelCase"
)]
pub struct DailySoInput {
    pdf_path: String,
    template_path: String,
    output_folder: Option<String>,
    quantity_overrides: Option<Value>,
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
pub async fn preview_daily_so(
    input: DailySoInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            validate_input(
                &input,
                false,
            )?;

            run_python(
                &input,
                true,
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบ Preview SO หยุดทำงาน: {}",
            error,
        )
    })?
}

#[tauri::command]
pub async fn process_daily_so(
    input: DailySoInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            validate_input(
                &input,
                true,
            )?;

            run_python(
                &input,
                false,
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบสร้างไฟล์ SO หยุดทำงาน: {}",
            error,
        )
    })?
}

fn validate_input(
    input: &DailySoInput,
    require_output: bool,
) -> Result<(), String> {
    validate_file(
        &input.pdf_path,
        "pdf",
        "ไม่พบไฟล์ PDF",
    )?;

    validate_file(
        &input.template_path,
        "xlsx",
        "ไม่พบไฟล์ Data-SO.Import.xlsx",
    )?;

    if require_output {
        let output_folder = input
            .output_folder
            .as_deref()
            .unwrap_or("")
            .trim();

        if output_folder.is_empty() {
            return Err(
                "ไม่พบโฟลเดอร์ปลายทาง"
                    .to_string(),
            );
        }

        if input
            .quantity_overrides
            .as_ref()
            .is_some_and(|value| {
                !value.is_object()
            })
        {
            return Err(
                "ข้อมูลตัดยอดไม่ถูกต้อง"
                    .to_string(),
            );
        }
    }

    Ok(())
}

fn validate_file(
    value: &str,
    extension: &str,
    message: &str,
) -> Result<(), String> {
    let path = Path::new(
        value.trim(),
    );

    if !path.is_file() {
        return Err(
            format!(
                "{}: {}",
                message,
                path.display(),
            ),
        );
    }

    let valid_extension = path
        .extension()
        .and_then(|value| {
            value.to_str()
        })
        .is_some_and(|value| {
            value.eq_ignore_ascii_case(
                extension,
            )
        });

    if !valid_extension {
        return Err(
            format!(
                "ชนิดไฟล์ไม่ถูกต้อง: {}",
                path.display(),
            ),
        );
    }

    Ok(())
}

fn run_python(
    input: &DailySoInput,
    preview_only: bool,
) -> Result<Value, String> {
    let project_path =
        get_project_path()?;

    let python_folder =
        project_path.join(
            "python",
        );

    let cli_path =
        python_folder.join(
            "daily_so_cli.py",
        );

    if !cli_path.is_file() {
        return Err(
            format!(
                "ไม่พบ Daily SO Engine ที่ {}",
                cli_path.display(),
            ),
        );
    }

    let python_path =
        get_python_path(
            &project_path,
        );

    let mut command =
        Command::new(
            python_path,
        );

    command
        .current_dir(
            &project_path,
        )
        .env(
            "PYTHONUTF8",
            "1",
        )
        .env(
            "PYTHONIOENCODING",
            "utf-8",
        )
        .env(
            "PYTHONPATH",
            &python_folder,
        )
        .arg(
            &cli_path,
        )
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
        );

    if preview_only {
        command.arg(
            "--preview",
        );
    } else {
        let output_folder = input
            .output_folder
            .as_deref()
            .unwrap_or("");

        command
            .arg(
                "--output-folder",
            )
            .arg(
                output_folder,
            );

        let quantity_overrides = input
            .quantity_overrides
            .as_ref()
            .map(|value| {
                serde_json::to_string(
                    value,
                )
            })
            .transpose()
            .map_err(|error| {
                format!(
                    "แปลงข้อมูลตัดยอดไม่สำเร็จ: {}",
                    error,
                )
            })?
            .unwrap_or_else(|| {
                "{}".to_string()
            });

        command
            .arg(
                "--quantity-overrides-json",
            )
            .arg(
                quantity_overrides,
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
                "ไม่สามารถเปิด Daily SO Engine ได้: {}",
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
            "Python ไม่ได้ส่งข้อมูล SO กลับมา"
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
                "อ่านผลลัพธ์ SO ไม่สำเร็จ: {}\n{}",
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
                    "ประมวลผล SO ไม่สำเร็จ"
                        .to_string()
                }),
        );
    }

    response
        .data
        .ok_or_else(|| {
            "Python ไม่ได้ส่งข้อมูล SO กลับมา"
                .to_string()
        })
}

fn get_project_path()
    -> Result<PathBuf, String>
{
    let cargo_folder =
        PathBuf::from(
            env!(
                "CARGO_MANIFEST_DIR"
            ),
        );

    cargo_folder
        .parent()
        .map(
            Path::to_path_buf,
        )
        .ok_or_else(|| {
            "ไม่พบโฟลเดอร์โปรเจกต์"
                .to_string()
        })
}

fn get_python_path(
    project_path: &Path,
) -> PathBuf {
    #[cfg(
        target_os = "windows"
    )]
    let virtual_python =
        project_path
            .join(
                ".venv",
            )
            .join(
                "Scripts",
            )
            .join(
                "python.exe",
            );

    #[cfg(
        not(
            target_os = "windows"
        )
    )]
    let virtual_python =
        project_path
            .join(
                ".venv",
            )
            .join(
                "bin",
            )
            .join(
                "python",
            );

    if virtual_python.is_file() {
        return virtual_python;
    }

    #[cfg(
        target_os = "windows"
    )]
    {
        PathBuf::from(
            "python",
        )
    }

    #[cfg(
        not(
            target_os = "windows"
        )
    )]
    {
        PathBuf::from(
            "python3",
        )
    }
}
