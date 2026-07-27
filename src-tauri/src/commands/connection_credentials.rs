const CREDENTIAL_SERVICE: &str = "com.valueplus.system";
const CREDENTIAL_ACCOUNT: &str = "apps-script-device-token";

fn credential_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(
        CREDENTIAL_SERVICE,
        CREDENTIAL_ACCOUNT,
    )
    .map_err(|error| {
        format!(
            "เปิด Windows Credential Manager ไม่สำเร็จ: {}",
            error,
        )
    })
}

#[tauri::command]
pub fn get_connection_token(
) -> Result<Option<String>, String> {
    let entry = credential_entry()?;

    match entry.get_password() {
        Ok(token) if !token.trim().is_empty() => {
            Ok(Some(token))
        }
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!(
            "อ่านสิทธิ์เชื่อมต่อจาก Windows ไม่สำเร็จ: {}",
            error,
        )),
    }
}

#[tauri::command]
pub fn save_connection_token(
    token: String,
) -> Result<(), String> {
    let normalized = token.trim();

    if normalized.is_empty() {
        return Err(
            "ไม่พบ Device Token สำหรับบันทึก"
                .to_string(),
        );
    }

    credential_entry()?
        .set_password(normalized)
        .map_err(|error| {
            format!(
                "บันทึกสิทธิ์ลง Windows Credential Manager ไม่สำเร็จ: {}",
                error,
            )
        })
}

#[tauri::command]
pub fn clear_connection_token(
) -> Result<(), String> {
    let entry = credential_entry()?;

    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {
            Ok(())
        }
        Err(error) => Err(format!(
            "ลบสิทธิ์เชื่อมต่อไม่สำเร็จ: {}",
            error,
        )),
    }
}
