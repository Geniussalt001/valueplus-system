use tauri::{
    Manager,
    WebviewUrl,
    WebviewWindow,
    WebviewWindowBuilder,
};

const GOOGLE_SHEETS_PREFIX: &str =
    "https://docs.google.com/spreadsheets/d/";

#[tauri::command]
pub fn open_receivables_sheet_editor(
    app: tauri::AppHandle,
    caller: WebviewWindow,
    spreadsheet_id: String,
    title: String,
) -> Result<(), String> {
    if caller.label() != "main" {
        return Err(
            "คำสั่งนี้อนุญาตให้เรียกจากหน้าต่างหลักเท่านั้น"
                .to_string(),
        );
    }

    let spreadsheet_id =
        spreadsheet_id.trim();

    if spreadsheet_id.len() < 20
        || spreadsheet_id.len() > 100
        || !spreadsheet_id
            .chars()
            .all(|character| {
                character.is_ascii_alphanumeric()
                    || character == '-'
                    || character == '_'
            })
    {
        return Err(
            "รหัส Google Sheet ไม่ถูกต้อง"
                .to_string(),
        );
    }

    let label = format!(
        "google-sheet-{}",
        &spreadsheet_id[
            ..spreadsheet_id
                .len()
                .min(48)
        ],
    );

    if let Some(window) =
        app.get_webview_window(&label)
    {
        window
            .show()
            .map_err(|error| {
                format!(
                    "แสดงหน้าต่าง Google Sheet ไม่สำเร็จ: {}",
                    error,
                )
            })?;

        window
            .set_focus()
            .map_err(|error| {
                format!(
                    "โฟกัสหน้าต่าง Google Sheet ไม่สำเร็จ: {}",
                    error,
                )
            })?;

        return Ok(());
    }

    let url = format!(
        "{}{}/edit",
        GOOGLE_SHEETS_PREFIX,
        spreadsheet_id,
    )
    .parse()
    .map_err(|error| {
        format!(
            "สร้าง URL ของ Google Sheet ไม่สำเร็จ: {}",
            error,
        )
    })?;

    let safe_title = title
        .replace(['\r', '\n'], " ")
        .trim()
        .chars()
        .take(120)
        .collect::<String>();

    WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::External(url),
    )
    .title(
        if safe_title.is_empty() {
            "Google Sheets - ValuePlus"
        } else {
            &safe_title
        },
    )
    .inner_size(
        1600.0,
        950.0,
    )
    .min_inner_size(
        1100.0,
        700.0,
    )
    .center()
    .resizable(true)
    .maximized(true)
    .build()
    .map_err(|error| {
        format!(
            "เปิด Google Sheets Editor ไม่สำเร็จ: {}",
            error,
        )
    })?;

    Ok(())
}
