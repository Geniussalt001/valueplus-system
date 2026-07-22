
use serde::Deserialize;
use serde_json::Value;

use crate::python_engine::engine_command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductCatalogInput {
    database_path: String,
    action: String,
    product_code: Option<String>,
    display_name: Option<String>,
    line_name: Option<String>,
    display_order: Option<i64>,
    active: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct PythonResponse {
    success: bool,
    data: Option<Value>,
    message: Option<String>,
}

#[tauri::command]
pub async fn manage_product_catalog(
    input: ProductCatalogInput,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_input(&input)?;
        run_python(&input)
    })
    .await
    .map_err(|error| {
        format!("ระบบจัดการสินค้าหยุดทำงาน: {}", error)
    })?
}

fn validate_input(
    input: &ProductCatalogInput,
) -> Result<(), String> {
    if input.database_path.trim().is_empty() {
        return Err("ไม่พบตำแหน่งฐานข้อมูลสินค้า".to_string());
    }

    match input.action.as_str() {
        "list" => Ok(()),
        "create" | "update" | "set-active" | "delete" => {
            if input
                .product_code
                .as_deref()
                .unwrap_or("")
                .trim()
                .is_empty()
            {
                return Err("กรุณาระบุรหัสสินค้า".to_string());
            }

            if input.action == "create"
                && input
                    .display_name
                    .as_deref()
                    .unwrap_or("")
                    .trim()
                    .is_empty()
            {
                return Err("กรุณาระบุชื่อสินค้า".to_string());
            }

            Ok(())
        }
        _ => Err(format!(
            "ไม่รู้จักคำสั่งจัดการสินค้า: {}",
            input.action,
        )),
    }
}

fn run_python(
    input: &ProductCatalogInput,
) -> Result<Value, String> {
    let mut command = engine_command(
        "product-catalog",
        "product_catalog_cli.py",
    )?;
    command
        .arg("--database")
        .arg(&input.database_path)
        .arg(&input.action);

    if let Some(code) = &input.product_code {
        command.arg("--code").arg(code);
    }

    match input.action.as_str() {
        "create" => {
            command
                .arg("--display-name")
                .arg(input.display_name.as_deref().unwrap_or(""))
                .arg("--line-name")
                .arg(input.line_name.as_deref().unwrap_or(""))
                .arg("--active")
                .arg(if input.active.unwrap_or(true) { "1" } else { "0" });

            if let Some(order) = input.display_order {
                command.arg("--order").arg(order.to_string());
            }
        }
        "update" => {
            if let Some(name) = &input.display_name {
                command.arg("--display-name").arg(name);
            }
            if let Some(name) = &input.line_name {
                command.arg("--line-name").arg(name);
            }
            if let Some(order) = input.display_order {
                command.arg("--order").arg(order.to_string());
            }
        }
        "set-active" => {
            command
                .arg("--active")
                .arg(if input.active.unwrap_or(true) { "1" } else { "0" });
        }
        _ => {}
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let output = command.output().map_err(|error| {
        format!("ไม่สามารถเปิด Product Catalog Engine ได้: {}", error)
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();
    let stderr = String::from_utf8_lossy(&output.stderr)
        .trim()
        .to_string();
    let response_text = if stdout.is_empty() { stderr } else { stdout };

    if response_text.is_empty() {
        return Err("Python ไม่ได้ส่งข้อมูลสินค้ากลับมา".to_string());
    }

    let response: PythonResponse =
        serde_json::from_str(&response_text).map_err(|error| {
            format!(
                "อ่านผลลัพธ์ Product Catalog ไม่สำเร็จ: {}\n{}",
                error, response_text,
            )
        })?;

    if !output.status.success() || !response.success {
        return Err(response.message.unwrap_or_else(|| {
            "จัดการข้อมูลสินค้าไม่สำเร็จ".to_string()
        }));
    }

    response
        .data
        .ok_or_else(|| "Python ไม่ได้ส่งข้อมูลสินค้ากลับมา".to_string())
}
