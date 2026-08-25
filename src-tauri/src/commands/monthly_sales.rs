use std::path::PathBuf;

use serde::Deserialize;
use serde_json::Value;
use tauri::{
    path::BaseDirectory,
    AppHandle,
    Manager,
};

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn get_monthly_sales(
    app: AppHandle,
    selected_month: Option<String>,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || {
            run_python(
                &app,
                "summary",
                None,
                selected_month.as_deref(),
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบสรุปยอดขายรายเดือนหยุดทำงาน: {}",
            error,
        )
    })?
}

#[tauri::command]
pub async fn preview_monthly_sales(
    app: AppHandle,
    csv_path: String,
) -> Result<Value, String> {
    validate_csv(&csv_path)?;

    tauri::async_runtime::spawn_blocking(
        move || {
            run_python(
                &app,
                "preview",
                Some(&csv_path),
                None,
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบตรวจสอบยอดขายรายเดือนหยุดทำงาน: {}",
            error,
        )
    })?
}

#[tauri::command]
pub async fn import_monthly_sales(
    app: AppHandle,
    csv_path: String,
) -> Result<Value, String> {
    validate_csv(&csv_path)?;

    tauri::async_runtime::spawn_blocking(
        move || {
            run_python(
                &app,
                "import",
                Some(&csv_path),
                None,
            )
        },
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบอัปเดตยอดขายรายเดือนหยุดทำงาน: {}",
            error,
        )
    })?
}

fn validate_csv(csv_path: &str) -> Result<(), String> {
    let path = std::path::Path::new(csv_path.trim());
    if !path.is_file() {
        return Err(format!(
            "ไม่พบไฟล์ CSV: {}",
            path.display(),
        ));
    }

    let valid = path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| {
            value.eq_ignore_ascii_case("csv")
        });

    if !valid {
        return Err(
            "รองรับเฉพาะไฟล์ CSV เท่านั้น"
                .to_string(),
        );
    }
    Ok(())
}

fn monthly_paths(
    app: &AppHandle,
) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| {
            format!(
                "ไม่พบโฟลเดอร์ข้อมูลของระบบ: {}",
                error,
            )
        })?
        .join("monthly-sales");

    let workbook_path = app
        .path()
        .desktop_dir()
        .map_err(|error| {
            format!("ไม่พบ Desktop: {}", error)
        })?
        .join("สรุปยอดขายรายเดือน")
        .join("สรุปยอดขายรายเดือน.xlsx");

    let seed_path = app
        .path()
        .resolve(
            "resources/data/monthly_sales_seed.json",
            BaseDirectory::Resource,
        )
        .map_err(|error| {
            format!(
                "ไม่พบข้อมูลยอดขายเริ่มต้น: {}",
                error,
            )
        })?;

    Ok((data_dir, workbook_path, seed_path))
}

fn run_python(
    app: &AppHandle,
    operation: &str,
    csv_path: Option<&str>,
    selected_month: Option<&str>,
) -> Result<Value, String> {
    let (data_dir, workbook_path, seed_path) =
        monthly_paths(app)?;
    let mut command = engine_command(
        "monthly-sales",
        "monthly_sales_cli.py",
    )?;

    command
        .arg("--operation")
        .arg(operation)
        .arg("--data-dir")
        .arg(data_dir)
        .arg("--seed")
        .arg(seed_path)
        .arg("--workbook")
        .arg(workbook_path);

    if let Some(csv_path) = csv_path {
        command.arg("--csv").arg(csv_path);
    }
    if let Some(selected_month) = selected_month {
        command
            .arg("--selected-month")
            .arg(selected_month);
    }

    let output = command.output().map_err(|error| {
        format!(
            "ไม่สามารถเปิดระบบยอดขายรายเดือนได้: {}",
            error,
        )
    })?;

    let stdout = String::from_utf8_lossy(
        &output.stdout,
    )
    .trim()
    .to_string();
    let stderr = String::from_utf8_lossy(
        &output.stderr,
    )
    .trim()
    .to_string();
    let response_text = if stdout.is_empty() {
        stderr
    } else {
        stdout
    };

    if response_text.is_empty() {
        return Err(
            "ระบบยอดขายรายเดือนไม่ได้ส่งข้อมูลกลับมา"
                .to_string(),
        );
    }

    let response: PythonResponse =
        serde_json::from_str(&response_text)
            .map_err(|error| {
                format!(
                    "อ่านผลลัพธ์ยอดขายรายเดือนไม่สำเร็จ: {}\n{}",
                    error,
                    response_text,
                )
            })?;

    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| {
            "ประมวลผลยอดขายรายเดือนไม่สำเร็จ"
                .to_string()
        }));
    }

    response.data.ok_or_else(|| {
        "ระบบยอดขายรายเดือนไม่ได้ส่งข้อมูลกลับมา"
            .to_string()
    })
}
