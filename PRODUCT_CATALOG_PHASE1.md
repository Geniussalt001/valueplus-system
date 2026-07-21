# ValuePlus Product Catalog — Phase 1

ฐานข้อมูลสินค้ากลางใช้ SQLite และไม่ต้องติดตั้งแพ็กเกจ Python เพิ่ม

ตำแหน่งฐานข้อมูลที่แนะนำ:

```text
Desktop\ValuePlus Data\valueplus.db
```

## กติกาการอัปเดต

- ใช้ `product_code` เป็นกุญแจหลักและห้ามซ้ำ
- รหัสใหม่จาก Express CSV จะถูกเพิ่มและเปิดใช้งานอัตโนมัติ
- ชื่อต้นทางล่าสุดเก็บใน `source_name`
- ชื่อที่ผู้ใช้แก้สำหรับหน้าจอเก็บใน `display_name` และไม่ถูก CSV เขียนทับ
- ชื่อสำหรับส่ง LINE เก็บใน `line_name`
- สินค้าที่ไม่พบในไฟล์วันนี้จะไม่ถูกปิดอัตโนมัติ
- การหยุดขายต้องเปลี่ยน `active` เป็น 0
- เก็บประวัติชื่อ ราคา โปรโมชัน และการนำเข้าไฟล์
- ไฟล์เดิมที่มี SHA-256 เดิมจะไม่ถูกนำเข้าซ้ำ

## ทดสอบนำเข้า Express CSV

```powershell
$db = "$env:USERPROFILE\Desktop\ValuePlus Data\valueplus.db"

& ".\.venv\Scripts\python.exe" `
  ".\python\product_catalog_cli.py" `
  --database $db `
  import-express `
  --csv "C:\path\to\142.CSV"
```

## ดูรายการสินค้า

```powershell
& ".\.venv\Scripts\python.exe" `
  ".\python\product_catalog_cli.py" `
  --database $db `
  list
```

## แก้ชื่อแสดงผลและชื่อ LINE

```powershell
& ".\.venv\Scripts\python.exe" `
  ".\python\product_catalog_cli.py" `
  --database $db `
  update `
  --code "01-0000-29" `
  --display-name "มิลล์เค้ก" `
  --line-name "มิลล์เค้ก" `
  --order 1
```

## เปิดหรือปิดสินค้า

```powershell
& ".\.venv\Scripts\python.exe" `
  ".\python\product_catalog_cli.py" `
  --database $db `
  set-active `
  --code "01-0000-36" `
  --active 0
```
