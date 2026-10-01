use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::Manager;

static STORE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Default, Deserialize, Serialize)]
pub struct Branch {
    code: String,
    name: String,
    address: String,
    route: String,
}
#[derive(Clone, Deserialize, Serialize)]
pub struct Line {
    code: String,
    name: String,
    quantity: f64,
    unit: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    number: String,
    date: String,
    branch: Branch,
    lines: Vec<Line>,
    remark: String,
    prepared_by: String,
}
#[derive(Default, Deserialize, Serialize)]
pub struct Store {
    branches: Vec<Branch>,
    notes: Vec<Note>,
}
fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?.join("branch-delivery");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    Ok(directory.join("documents.json"))
}
fn read_store(app: &tauri::AppHandle) -> Result<Store, String> {
    let path = store_path(app)?;
    let backup = path.with_extension("backup.json");
    let source = if path.exists() { path } else if backup.exists() { backup } else { return Ok(Store::default()); };
    serde_json::from_slice(&fs::read(source).map_err(|e| e.to_string())?).map_err(|e| format!("อ่านประวัติใบส่งของไม่สำเร็จ: {}", e))
}
fn write_store(app: &tauri::AppHandle, store: &Store) -> Result<(), String> {
    let path = store_path(app)?;
    let temporary = path.with_extension("tmp");
    let backup = path.with_extension("backup.json");
    fs::write(&temporary, serde_json::to_vec_pretty(store).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    if path.exists() {
        if backup.exists() { fs::remove_file(&backup).map_err(|e| e.to_string())?; }
        fs::rename(&path, &backup).map_err(|e| e.to_string())?;
    }
    if let Err(error) = fs::rename(&temporary, &path) {
        if backup.exists() { let _ = fs::rename(&backup, &path); }
        return Err(format!("บันทึกใบส่งของไม่สำเร็จ: {}", error));
    }
    Ok(())
}
fn validate_branch(branch: &Branch) -> Result<(), String> {
    if branch.code.trim().is_empty() || branch.name.trim().is_empty() || branch.address.trim().is_empty() {
        return Err("กรุณาระบุรหัสสาขา ชื่อสาขา และที่อยู่".into());
    }
    if branch.code.len() > 100 || branch.name.chars().count() > 100 || branch.address.chars().count() > 300 || branch.route.chars().count() > 100 {
        return Err("ข้อมูลสาขายาวเกินพื้นที่เอกสาร".into());
    }
    Ok(())
}
#[tauri::command]
pub fn load_branch_delivery(app: tauri::AppHandle) -> Result<Store, String> {
    let _guard = STORE_LOCK.lock().map_err(|e| e.to_string())?;
    read_store(&app)
}
#[tauri::command]
pub fn save_delivery_branch(app: tauri::AppHandle, mut branch: Branch) -> Result<Store, String> {
    branch.code = branch.code.trim().to_string();
    validate_branch(&branch)?;
    let _guard = STORE_LOCK.lock().map_err(|e| e.to_string())?;
    let mut store = read_store(&app)?;
    if let Some(existing) = store.branches.iter_mut().find(|item| item.code == branch.code) { *existing = branch; }
    else { store.branches.push(branch); }
    write_store(&app, &store)?;
    Ok(store)
}
#[tauri::command]
pub fn save_branch_delivery_note(app: tauri::AppHandle, mut note: Note) -> Result<Store, String> {
    validate_branch(&note.branch)?;
    let parts: Vec<&str> = note.date.split('-').collect();
    if parts.len() != 3 || parts[0].len() != 4 || parts[1].len() != 2 || parts[2].len() != 2 { return Err("วันที่ไม่ถูกต้อง".into()); }
    let year = parts[0].parse::<u32>().map_err(|_| "ปีไม่ถูกต้อง")?;
    let month = parts[1].parse::<u32>().map_err(|_| "เดือนไม่ถูกต้อง")?;
    let day = parts[2].parse::<u32>().map_err(|_| "วันไม่ถูกต้อง")?;
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month { 4 | 6 | 9 | 11 => 30, 2 if leap => 29, 2 => 28, 1 | 3 | 5 | 7 | 8 | 10 | 12 => 31, _ => 0 };
    if !(2000..=2200).contains(&year) || day == 0 || day > days { return Err("วันที่ไม่ถูกต้อง".into()); }
    if note.lines.is_empty() || note.lines.len() > 240 { return Err("กรุณาระบุสินค้า 1–240 รายการ".into()); }
    if note.remark.chars().count() > 180 || note.prepared_by.chars().count() > 100 { return Err("ข้อความยาวเกินพื้นที่เอกสาร".into()); }
    for line in &note.lines {
        if line.code.trim().is_empty() || line.name.trim().is_empty() || line.unit.trim().is_empty() || !line.quantity.is_finite() || line.quantity <= 0.0 || line.quantity > 999999.0 || (line.quantity * 1000.0 - (line.quantity * 1000.0).round()).abs() > 0.0001 {
            return Err("กรุณาตรวจรหัสสินค้า ชื่อ จำนวน (ทศนิยมไม่เกิน 3 ตำแหน่ง) และหน่วย".into());
        }
    }
    let _guard = STORE_LOCK.lock().map_err(|e| e.to_string())?;
    let mut store = read_store(&app)?;
    let next = store.notes.len() + 1;
    note.number = format!("DN-{}-{:06}", note.date.replace('-', ""), next);
    store.notes.insert(0, note);
    write_store(&app, &store)?;
    Ok(store)
}
#[tauri::command]
pub fn export_branch_delivery_html(app: tauri::AppHandle, number: String, html: String) -> Result<String, String> {
    if number.is_empty() || !number.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') { return Err("เลขที่เอกสารไม่ถูกต้อง".into()); }
    let directory = app.path().desktop_dir().map_err(|e| e.to_string())?.join("ValuePlus Delivery Notes");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let path = directory.join(format!("{}.html", number));
    fs::write(&path, html).map_err(|e| format!("สร้างไฟล์พิมพ์ไม่สำเร็จ: {}", e))?;
    Ok(path.to_string_lossy().into_owned())
}
