# ValuePlus — หน้าจัดการข้อมูลสินค้า

หน้าจอนี้จัดการฐานข้อมูล `Desktop\ValuePlus Data\valueplus.db` ผ่านโปรแกรม ValuePlus โดยไม่ต้องเปิดไฟล์ฐานข้อมูลเอง

## ความสามารถ

- แสดงสินค้าทั้งหมด พร้อมรหัส ชื่อต้นทาง ชื่อแสดงผล ชื่อ LINE และวันที่พบล่าสุด
- ค้นหาด้วยรหัสหรือชื่อสินค้า
- กรองสินค้าที่เปิดใช้งานหรือปิดใช้งาน
- เพิ่มสินค้าใหม่ด้วยมือ
- แก้ไขชื่อแสดงผล ชื่อ LINE และลำดับ
- เปิดหรือปิดการใช้งาน โดยเก็บประวัติสินค้าไว้
- ลบถาวร พร้อมกล่องยืนยันและข้อความแนะนำให้ปิดใช้งานแทน
- สินค้าใหม่จาก Express ยังเพิ่มเข้าฐานข้อมูลอัตโนมัติตามเดิม
- ชุดนี้รวมระบบอัปเดตฐานข้อมูลจากหน้า Express แล้ว ติดตั้ง ZIP นี้ชุดเดียวได้

## ติดตั้ง

ปิด `tauri dev` ก่อน แล้วแตก ZIP ทับที่รากโปรเจกต์

```powershell
$zip = "$env:USERPROFILE\Downloads\valueplus-product-manager-v1.zip"

Expand-Archive `
  -LiteralPath $zip `
  -DestinationPath "D:\valueplus-system" `
  -Force

cd D:\valueplus-system

& ".\.venv\Scripts\python.exe" `
  ".\install_product_catalog.py" `
  "D:\valueplus-system"

& ".\.venv\Scripts\python.exe" -m py_compile `
  ".\python\express_summary_cli.py" `
  ".\python\product_catalog_cli.py" `
  ".\python\valueplus_catalog\catalog.py"

& "$env:APPDATA\npm\pnpm.cmd" build
& "$env:APPDATA\npm\pnpm.cmd" tauri dev
```

หลังติดตั้งจะมีเมนู **จัดการข้อมูลสินค้า** บน Dashboard และแถบเมนูด้านซ้าย
