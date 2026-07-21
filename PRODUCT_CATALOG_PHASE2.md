# ValuePlus Product Catalog — Phase 2

ชุดนี้เชื่อมฐานข้อมูลสินค้ากับการประมวลผลหน้า **สรุปยอด Express**

## การทำงาน

- เมื่อกด `ประมวลผล CSV` ระบบอ่านข้อมูล Express ตามเดิม
- ระบบสร้างฐานข้อมูลอัตโนมัติที่ `Desktop\ValuePlus Data\valueplus.db`
- รหัสสินค้าที่ไม่เคยพบจะถูกเพิ่มเป็นสินค้าใหม่
- สินค้าเดิมจะอัปเดตชื่อจากต้นทางและวันที่พบล่าสุด
- การนำเข้าไฟล์เดิมซ้ำจะไม่สร้างข้อมูลซ้ำ
- สินค้าที่ไม่ปรากฏในไฟล์วันนี้จะไม่ถูกปิดการใช้งาน
- ชื่อแสดงผลและชื่อสำหรับ LINE ที่ผู้ใช้แก้เองจะไม่ถูกเขียนทับ
- หน้า Express แสดงจำนวนสินค้าที่พบ เพิ่มใหม่ และอัปเดต

## ติดตั้ง

ปิด `tauri dev` ก่อน แล้วแตก ZIP ทับที่รากโปรเจกต์ `D:\valueplus-system`

```powershell
$zip = "$env:USERPROFILE\Downloads\valueplus-product-catalog-phase2.zip"

Expand-Archive `
  -LiteralPath $zip `
  -DestinationPath "D:\valueplus-system" `
  -Force

cd D:\valueplus-system

& ".\.venv\Scripts\python.exe" -m py_compile `
  ".\python\express_summary_cli.py" `
  ".\python\valueplus_summary\express_parser.py" `
  ".\python\valueplus_catalog\catalog.py"

& "$env:APPDATA\npm\pnpm.cmd" build
& "$env:APPDATA\npm\pnpm.cmd" tauri dev
```

## ผลที่ควรเห็น

ครั้งแรกที่ประมวลผลไฟล์ตัวอย่าง ระบบจะแจ้งว่า:

- พบสินค้า 19 รายการ
- เพิ่มใหม่ 19 รายการ
- อัปเดต 0 รายการ

เมื่อประมวลผลไฟล์เดิมซ้ำ ระบบจะแจ้งว่าไฟล์นี้เคยอัปเดตฐานข้อมูลแล้ว และไม่เพิ่มสินค้าซ้ำ
