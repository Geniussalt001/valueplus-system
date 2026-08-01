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

## เปิดใช้แฟ้ม Retail Worldwide

ระบบใช้ Google Drive เดิม และสร้างโครงสร้างนี้ให้อัตโนมัติ:

`ValuePlus System PDFs / Retail Worldwide / ปี พ.ศ. / เดือนภาษาไทย / ไฟล์ PO และ IV`

1. เพิ่ม `WorldwideRetailRepository.gs`
2. เพิ่ม `SetupWorldwideRetail.gs`
3. แทนที่ `Router.gs` ด้วยไฟล์ล่าสุดในโฟลเดอร์นี้
4. รัน `setupWorldwideRetailSystem()` หนึ่งครั้ง
5. Deploy > Manage deployments > Edit > New version > Deploy

ฝั่ง `OFFICE` สามารถบันทึกรายการและ PDF ได้ ส่วน `HEADOFFICE`
สามารถกดยืนยันสีเขียวว่าได้รับแล้ว หรือกากบาทสีแดงเพื่อแจ้งว่ายังไม่ได้รับ
และเปลี่ยนคำตอบภายหลังได้
ทั้งสองฝั่งเห็นแฟ้มและสถานะชุดเดียวกัน

หน้าแฟ้มแสดงลำดับ `แฟ้มปี → แฟ้มเดือน → รายการ` ปุ่ม `View`
เรียก `worldwide.getPdf` เพื่อเปิด Preview ภายในระบบ ส่วนปุ่ม `Drive`
เปิดไฟล์ต้นฉบับบน Google Drive

## กฎป้องกันข้อมูลเสีย

- รับเฉพาะ PDF ไม่เกิน 8 MB ต่อไฟล์
- เลข PO ซ้ำจะไม่อัปโหลดและไม่เขียนทับ
- ชื่อไฟล์ซ้ำในโฟลเดอร์วันเดียวกันจะไม่เขียนทับ
- ไฟล์ในเครื่องยังคงอยู่แม้อัปโหลด Drive ไม่สำเร็จ
- Retail Worldwide รับ PDF ของ PO และ IV ไม่เกิน 8 MB ต่อไฟล์
- รายการ Retail Worldwide ที่มีเลข IV, PO และ SO ซ้ำกันจะไม่ถูกบันทึกซ้ำ
