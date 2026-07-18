use std::{
    path::{Path, PathBuf},
    process::Command,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintWorkbookInput {
    workbook_path: String,
    warehouses: Vec<WarehousePrintRequest>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WarehousePrintRequest {
    warehouse: String,
    sheets: Vec<String>,
    copies: u32,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn print_po_workbook(
    input: PrintWorkbookInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(
        move || run_print_command(input),
    )
    .await
    .map_err(|error| {
        format!(
            "ระบบพิมพ์หยุดทำงาน: {}",
            error,
        )
    })?
}

fn run_print_command(
    input: PrintWorkbookInput,
) -> Result<Value, String> {
    validate_input(&input)?;

    let project_path = get_project_path()?;

    let python_folder = project_path.join(
        "python",
    );

    let print_cli_path = python_folder.join(
        "print_cli.py",
    );

    if !print_cli_path.is_file() {
        return Err(format!(
            "ไม่พบ Print Engine ที่ {}",
            print_cli_path.display(),
        ));
    }

    let print_jobs_json = serde_json::to_string(
        &input.warehouses,
    )
    .map_err(|error| {
        format!(
            "สร้างข้อมูลการพิมพ์ไม่สำเร็จ: {}",
            error,
        )
    })?;

    let python_path = get_python_path(
        &project_path,
    );

    let mut command = Command::new(
        python_path,
    );

    command
        .current_dir(&project_path)
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
        .arg(&print_cli_path)
        .arg("--workbook")
        .arg(&input.workbook_path)
        .arg("--jobs-json")
        .arg(print_jobs_json);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        // ป้องกันไม่ให้หน้าต่าง Command Prompt
        // แสดงขึ้นมาระหว่างเรียก Python
        command.creation_flags(
            0x08000000,
        );
    }

    let output = command
        .output()
        .map_err(|error| {
            format!(
                "ไม่สามารถเปิด Print Engine ได้: {}",
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
            "Print Engine ไม่ได้ส่งข้อมูลกลับมา"
                .to_string(),
        );
    }

    let response: PythonResponse =
        serde_json::from_str(
            &response_text,
        )
        .map_err(|error| {
            format!(
                "อ่านผลลัพธ์จาก Print Engine ไม่สำเร็จ: {}\n{}",
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
                    "สั่งพิมพ์เอกสารไม่สำเร็จ"
                        .to_string()
                }),
        );
    }

    response.data.ok_or_else(|| {
        "Print Engine ไม่ได้ส่งผลลัพธ์กลับมา"
            .to_string()
    })
}

fn validate_input(
    input: &PrintWorkbookInput,
) -> Result<(), String> {
    if !Path::new(
        &input.workbook_path,
    )
    .is_file()
    {
        return Err(format!(
            "ไม่พบไฟล์ Excel: {}",
            input.workbook_path,
        ));
    }

    if input.warehouses.is_empty() {
        return Err(
            "กรุณาเลือกคลังที่ต้องการพิมพ์"
                .to_string(),
        );
    }

    /*
     * จุดที่แก้ Warning:
     *
     * เดิม:
     * for warehouse in (
     *     &input.warehouses
     * ) {
     *
     * แก้เป็น:
     */
    for warehouse in &input.warehouses {
        if warehouse
            .warehouse
            .trim()
            .is_empty()
        {
            return Err(
                "พบรายการคลังที่ไม่มีชื่อ"
                    .to_string(),
            );
        }

        if warehouse.sheets.is_empty() {
            return Err(format!(
                "คลัง {} ไม่มีชีตสำหรับพิมพ์",
                warehouse.warehouse,
            ));
        }

        if warehouse.copies == 0
            || warehouse.copies > 99
        {
            return Err(format!(
                "จำนวนชุดของคลัง {} ไม่ถูกต้อง",
                warehouse.warehouse,
            ));
        }
    }

    Ok(())
}

fn get_project_path()
    -> Result<PathBuf, String>
{
    let cargo_folder = PathBuf::from(
        env!("CARGO_MANIFEST_DIR"),
    );

    cargo_folder
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| {
            "ไม่พบโฟลเดอร์โปรเจกต์"
                .to_string()
        })
}

fn get_python_path(
    project_path: &Path,
) -> PathBuf {
    #[cfg(target_os = "windows")]
    let virtual_python = project_path
        .join(".venv")
        .join("Scripts")
        .join("python.exe");

    #[cfg(not(target_os = "windows"))]
    let virtual_python = project_path
        .join(".venv")
        .join("bin")
        .join("python");

    if virtual_python.is_file() {
        return virtual_python;
    }

    #[cfg(target_os = "windows")]
    {
        PathBuf::from(
            "python",
        )
    }

    #[cfg(not(target_os = "windows"))]
    {
        PathBuf::from(
            "python3",
        )
    }
}