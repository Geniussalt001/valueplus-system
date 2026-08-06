use std::{
    fs,
    path::{
        Path,
        PathBuf,
    },
};

use base64::{
    engine::general_purpose::STANDARD,
    Engine as _,
};
use serde::Serialize;
use serde_json::Value;

const MAX_PDF_SIZE_BYTES: u64 =
    8 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPdfData {
    file_name: String,
    base64_data: String,
    size: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPdfMetadata {
    file_name: String,
    size: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumableUploadResult {
    file_id: String,
    file_name: String,
}

#[tauri::command]
pub fn get_local_pdf_metadata(
    path: String,
) -> Result<LocalPdfMetadata, String> {
    let pdf_path = validate_local_pdf(&path)?;
    let metadata = fs::metadata(pdf_path)
        .map_err(|error| {
            format!(
                "อ่านข้อมูลไฟล์ PDF ไม่สำเร็จ: {}",
                error,
            )
        })?;

    Ok(LocalPdfMetadata {
        file_name: pdf_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("document.pdf")
            .to_string(),
        size: metadata.len(),
    })
}

#[tauri::command]
pub async fn upload_pdf_resumable(
    path: String,
    upload_url: String,
) -> Result<ResumableUploadResult, String> {
    let pdf_path = validate_local_pdf(&path)?;
    let bytes = fs::read(pdf_path)
        .map_err(|error| {
            format!(
                "อ่านไฟล์ PDF เพื่ออัปโหลดไม่สำเร็จ: {}",
                error,
            )
        })?;
    let file_name = pdf_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("document.pdf")
        .to_string();
    let response = reqwest::Client::new()
        .put(upload_url)
        .header("Content-Type", "application/pdf")
        .header(
            "Content-Length",
            bytes.len().to_string(),
        )
        .body(bytes)
        .send()
        .await
        .map_err(|error| {
            format!(
                "ส่งไฟล์ไป Google Drive ไม่สำเร็จ: {}",
                error,
            )
        })?;
    let status = response.status();
    let payload = response
        .json::<Value>()
        .await
        .map_err(|error| {
            format!(
                "อ่านผลอัปโหลดจาก Google Drive ไม่สำเร็จ: {}",
                error,
            )
        })?;

    if !status.is_success() {
        return Err(format!(
            "Google Drive ปฏิเสธการอัปโหลด ({})",
            status.as_u16(),
        ));
    }

    let file_id = payload
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    if file_id.is_empty() {
        return Err(
            "Google Drive ไม่ได้ส่งรหัสไฟล์กลับมา"
                .to_string(),
        );
    }

    Ok(ResumableUploadResult {
        file_id,
        file_name: payload
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or(&file_name)
            .to_string(),
    })
}

#[tauri::command]
pub fn read_local_pdf_base64(
    path: String,
) -> Result<LocalPdfData, String> {
    let pdf_path = validate_local_pdf(&path)?;

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

fn validate_local_pdf(
    path: &str,
) -> Result<&Path, String> {
    let pdf_path = Path::new(path);

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

    Ok(pdf_path)
}

#[tauri::command]
pub fn save_archive_pdf_base64(
    folder_path: String,
    file_name: String,
    base64_data: String,
) -> Result<String, String> {
    let folder = Path::new(&folder_path);

    if !folder.is_dir() {
        return Err(format!(
            "ไม่พบโฟลเดอร์ปลายทาง: {}",
            folder_path,
        ));
    }

    let clean_name =
        sanitize_pdf_file_name(&file_name);

    let bytes = STANDARD
        .decode(
            base64_data
                .trim()
                .strip_prefix(
                    "data:application/pdf;base64,",
                )
                .unwrap_or(
                    base64_data.trim(),
                ),
        )
        .map_err(|error| {
            format!(
                "ถอดรหัสไฟล์ PDF ไม่สำเร็จ: {}",
                error,
            )
        })?;

    if bytes.len() as u64 > MAX_PDF_SIZE_BYTES {
        return Err(
            "ไฟล์ PDF ต้องมีขนาดไม่เกิน 8 MB"
                .to_string(),
        );
    }

    let output_path =
        unique_output_path(
            folder,
            &clean_name,
        );

    fs::write(
        &output_path,
        bytes,
    )
    .map_err(|error| {
        format!(
            "บันทึกไฟล์ PDF ไม่สำเร็จ: {}",
            error,
        )
    })?;

    Ok(
        output_path
            .to_string_lossy()
            .to_string(),
    )
}

fn sanitize_pdf_file_name(
    file_name: &str,
) -> String {
    let mut clean_name: String =
        file_name
            .chars()
            .map(|character| {
                if matches!(
                    character,
                    '\\'
                        | '/'
                        | ':'
                        | '*'
                        | '?'
                        | '"'
                        | '<'
                        | '>'
                        | '|'
                ) {
                    '_'
                } else {
                    character
                }
            })
            .collect();

    clean_name =
        clean_name.trim().to_string();

    if clean_name.is_empty() {
        clean_name =
            "document.pdf".to_string();
    }

    if !clean_name
        .to_lowercase()
        .ends_with(".pdf")
    {
        clean_name.push_str(".pdf");
    }

    clean_name
}

fn unique_output_path(
    folder: &Path,
    file_name: &str,
) -> PathBuf {
    let first_path =
        folder.join(file_name);

    if !first_path.exists() {
        return first_path;
    }

    let source_path =
        Path::new(file_name);

    let stem = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("document");

    for index in 2..=9999 {
        let candidate =
            folder.join(format!(
                "{} ({index}).pdf",
                stem,
            ));

        if !candidate.exists() {
            return candidate;
        }
    }

    folder.join(format!(
        "{}-{}.pdf",
        stem,
        chrono_free_timestamp(),
    ))
}

fn chrono_free_timestamp() -> u128 {
    std::time::SystemTime::now()
        .duration_since(
            std::time::UNIX_EPOCH,
        )
        .map(|duration| {
            duration.as_millis()
        })
        .unwrap_or(0)
}
