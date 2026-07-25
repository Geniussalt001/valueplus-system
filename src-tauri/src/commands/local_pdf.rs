use std::{
    fs,
    path::Path,
};

use base64::{
    engine::general_purpose::STANDARD,
    Engine as _,
};
use serde::Serialize;

const MAX_PDF_SIZE_BYTES: u64 =
    8 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPdfData {
    file_name: String,
    base64_data: String,
    size: u64,
}

#[tauri::command]
pub fn read_local_pdf_base64(
    path: String,
) -> Result<LocalPdfData, String> {
    let pdf_path = Path::new(&path);

    if !pdf_path.is_file() {
        return Err(format!(
            "ไม่พบไฟล์ PDF: {}",
            path,
        ));
    }

    let is_pdf = pdf_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);

    if !is_pdf {
        return Err(
            "รองรับเฉพาะไฟล์ PDF เท่านั้น"
                .to_string(),
        );
    }

    let metadata = fs::metadata(pdf_path)
        .map_err(|error| {
            format!(
                "อ่านข้อมูลไฟล์ PDF ไม่สำเร็จ: {}",
                error,
            )
        })?;

    if metadata.len() > MAX_PDF_SIZE_BYTES {
        return Err(
            "ไฟล์ PDF ต้องมีขนาดไม่เกิน 8 MB"
                .to_string(),
        );
    }

    let bytes = fs::read(pdf_path)
        .map_err(|error| {
            format!(
                "อ่านไฟล์ PDF ไม่สำเร็จ: {}",
                error,
            )
        })?;

    let file_name = pdf_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    Ok(LocalPdfData {
        file_name,
        base64_data: STANDARD.encode(bytes),
        size: metadata.len(),
    })
}
