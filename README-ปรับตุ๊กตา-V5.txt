ValuePlus System — Doll Summary Slots V5

สิ่งที่เปลี่ยน
- เปลี่ยน Card จากการรวมระดับคลัง เป็น Card แยกตามรอบ
- มหาชัย 1, 2, 3
- สำโรง 1, 2
- ร่มเกล้า 1, 2, 3
- ชลบุรี 1, 2
- รังสิต 1, 2
- โชคชัย 1, 2
- เชียงใหม่ 1 และเชียงใหม่ (ลาว)
- นครสวรรค์ 1, 2
- ขอนแก่น 1, 2, ขอนแก่น (ลาว), ขอนแก่น 4
- โคราช 1
- หาดใหญ่ 1
- สุราษฎร์ธานี 1, 2
- ถอดปุ่มเปิดประวัติและบันทึกร่างออก
- หน้า Doll Summary จะไม่เรียก manage_doll_summary อีก
- รวมการแก้สีข้อความหน้า Express ให้ชัดบนพื้นขาว

ติดตั้ง

cd D:\valueplus-system

Expand-Archive `
  -LiteralPath "$env:USERPROFILE\Downloads\valueplus-doll-slots-v5.zip" `
  -DestinationPath "D:\valueplus-system" `
  -Force

& "$env:APPDATA\npm\pnpm.cmd" build
& "$env:APPDATA\npm\pnpm.cmd" tauri dev

