# ติดตั้งแฟ้มบันทึกข้อมูล PO

ระบบนี้ใช้ Google Drive เดิมจาก `PDF_FOLDER_ID` และสร้างโครงสร้างย่อยอัตโนมัติ:

`ValuePlus System PDFs / Po Cpall / ปี พ.ศ. / เดือนภาษาไทย / วัน / ไฟล์ PDF`

## ไฟล์ที่ต้องเพิ่มหรือแทนที่ใน Apps Script

1. เพิ่ม `ArchiveRepository.gs`
2. เพิ่ม `SetupArchive.gs`
3. แทนที่ `Router.gs` ด้วยไฟล์ในโฟลเดอร์นี้
4. เปิด `ArchiveRepository.gs` แล้วตรวจว่ามีค่าคงที่ `PO_ARCHIVE_SHEET_NAME` และ `PO_ARCHIVE_HEADERS`
5. รัน `setupPoArchiveSystem()` หนึ่งครั้ง
6. Deploy > Manage deployments > Edit > New version > Deploy

ไม่ต้องเปลี่ยน `API_TOKEN`, `SPREADSHEET_ID` หรือ `PDF_FOLDER_ID`

## กฎป้องกันข้อมูลเสีย

- รับเฉพาะ PDF ไม่เกิน 8 MB ต่อไฟล์
- เลข PO ซ้ำจะไม่อัปโหลดและไม่เขียนทับ
- ชื่อไฟล์ซ้ำในโฟลเดอร์วันเดียวกันจะไม่เขียนทับ
- ไฟล์ในเครื่องยังคงอยู่แม้อัปโหลด Drive ไม่สำเร็จ
