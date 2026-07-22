use std::{fs, path::Path};

use tauri::{
    path::BaseDirectory,
    AppHandle,
    Manager,
};

pub(crate) fn install(app: &AppHandle) -> Result<(), String> {
    let desktop = app
        .path()
        .desktop_dir()
        .map_err(|error| format!("ไม่พบ Desktop: {error}"))?;

    install_file(
        app,
        "Data-SO.Import.xlsx",
        &desktop
            .join("รายงาน SOรายวัน")
            .join("Data-SO.Import.xlsx"),
    )?;

    install_file(
        app,
        "Templete ใบจัดสินค้า-Seven Eleven (ภายใน).xlsx",
        &desktop
            .join("รายงานใบจัดรายวัน")
            .join("Templete ใบจัดสินค้า-Seven Eleven (ภายใน).xlsx"),
    )?;

    Ok(())
}

fn install_file(
    app: &AppHandle,
    file_name: &str,
    destination: &Path,
) -> Result<(), String> {
    if destination.is_file() {
        return Ok(());
    }

    let source = app
        .path()
        .resolve(
            format!("resources/templates/{file_name}"),
            BaseDirectory::Resource,
        )
        .map_err(|error| {
            format!("ไม่พบ Template ในตัวติดตั้ง ({file_name}): {error}")
        })?;

    if !source.is_file() {
        return Err(format!(
            "ไม่พบ Template ในตัวติดตั้ง: {}",
            source.display(),
        ));
    }

    if let Some(folder) = destination.parent() {
        fs::create_dir_all(folder).map_err(|error| {
            format!("สร้างโฟลเดอร์ Template ไม่สำเร็จ: {error}")
        })?;
    }

    fs::copy(&source, destination).map_err(|error| {
        format!(
            "ติดตั้ง Template {} ไม่สำเร็จ: {}",
            destination.display(),
            error,
        )
    })?;

    Ok(())
}
