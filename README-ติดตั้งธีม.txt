ValuePlus System — Doll Summary History + Express Contrast V4

สิ่งที่เปลี่ยน
- เปลี่ยนภาพ Login เป็นภาพ ValuePlus สีขาว-แดงชุดใหม่
- เปลี่ยน Login, Splash, Sidebar, Header และ Dashboard เป็นธีมสีขาว-แดง
- ปรับ Card, ปุ่ม, Input, ตาราง, Modal และ Scrollbar ให้เป็นธีมเดียวกัน
- ปรับข้อความบนปุ่มให้คอนทราสต์สูงและอ่านชัด
- เปลี่ยน Card สรุปยอดตุ๊กตาจากสีชมพูเป็นสีน้ำเงิน
- เพิ่มหน้าสรุปยอดตุ๊กตาแบบคีย์มือ 14 คลัง พร้อม Realtime และคัดลอก LINE
- เพิ่มบันทึกร่าง เปิดประวัติ และลบประวัติสรุปยอดตุ๊กตาตามวันที่
- แก้ข้อความหน้า Express ให้เป็นสีเข้ม อ่านชัดบน Card สีขาว
- รักษาสีสถานะสำเร็จ/เตือน/ผิดพลาด เพื่อให้อ่านสถานะงานได้ชัดเจน
- ไม่แก้ไขตรรกะประมวลผล PDF, Excel, SO, การพิมพ์ หรือฐานข้อมูล

วิธีติดตั้งด้วย PowerShell

1. ปิดหน้าต่าง tauri dev ที่กำลังทำงานก่อน
2. แตก ZIP ทับลงในโปรเจกต์

   cd D:\valueplus-system

   Expand-Archive `
     -LiteralPath "$env:USERPROFILE\Downloads\valueplus-summary-v4.zip" `
     -DestinationPath "D:\valueplus-system" `
     -Force

3. ตรวจสอบ Production Build

   & "$env:APPDATA\npm\pnpm.cmd" build

4. เปิดระบบเพื่อดูดีไซน์

   & "$env:APPDATA\npm\pnpm.cmd" tauri dev

ไฟล์สำคัญที่ชุดนี้เพิ่มหรือแทนที่
- public/images/login-background-red-white.png
- src/styles/red-white-theme.css
- src/main.tsx
- src/pages/LoginPage.tsx
- src/pages/SplashPage.tsx
- src/pages/modules/DailySummaryPage.tsx
- src/pages/modules/doll/DollSummaryPage.tsx
- src/services/dollSummaryService.ts
- src/types/dollSummary.types.ts
- python/doll_summary_cli.py
- src-tauri/src/commands/doll_summary.rs
- src-tauri/src/commands/mod.rs
- src-tauri/src/lib.rs
- src/components/BrandLogo.tsx
