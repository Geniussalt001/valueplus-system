# ValuePlus PO Engine

เครื่องประมวลผล PDF และ Excel Template สำหรับส่วนงานแยกและเปลี่ยนชื่อ PO

## โครงสร้าง

```text
valueplus-po-engine/
├── cli.py
├── requirements.txt
└── valueplus_po/
    ├── constants.py
    ├── models.py
    ├── normalizers.py
    ├── pdf_parser.py
    ├── processor.py
    ├── product_matcher.py
    ├── template_reader.py
    └── xlsx_writer.py
```

## ติดตั้งสำหรับทดสอบบน Windows

เปิด PowerShell ที่ `D:\ValuePlus\valueplus-system` แล้วรัน:

```powershell
py -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r .\python\requirements.txt
```

นำโฟลเดอร์ชุดนี้ไปวางเป็น:

```text
D:\ValuePlus\valueplus-system\python
```

## ทดสอบ Preview

```powershell
$env:PYTHONPATH = ".\python"

& .\.venv\Scripts\python.exe .\python\cli.py `
  --pdf "D:\ไฟล์งาน\cpall_bdc_po_report.pdf" `
  --template "D:\ไฟล์งาน\Templete ใบจัดสินค้า.xlsx" `
  --start-iv "6907394" `
  --preview
```

## สร้าง Excel ผลลัพธ์

```powershell
$env:PYTHONPATH = ".\python"

& .\.venv\Scripts\python.exe .\python\cli.py `
  --pdf "D:\ไฟล์งาน\cpall_bdc_po_report.pdf" `
  --template "D:\ไฟล์งาน\Templete ใบจัดสินค้า.xlsx" `
  --start-iv "6907394" `
  --output "D:\ไฟล์งาน\ใบจัดสินค้า_ผลลัพธ์.xlsx"
```

ผลลัพธ์จากคำสั่งเป็น JSON เพื่อให้ Tauri เรียกใช้และส่งข้อมูล Preview ไปยัง React ได้โดยตรง

## กติกาความปลอดภัยของ Template

- แก้เฉพาะ `H2`, `B5`, `F5`, `D6` และ `D8:D26`
- ไม่ลบชีตที่ไม่มี PO
- ไม่เขียนไฟล์ทับ Template ต้นฉบับ
- ถ้าสินค้าไม่ตรงหรือไม่มีชีตปลายทาง จะหยุดก่อนสร้าง Excel
- ตัวเขียน Excel แก้เฉพาะ XML ของเซลล์เป้าหมาย เพื่อรักษารูปแบบ สูตร และส่วนขยายอื่นของ Template
