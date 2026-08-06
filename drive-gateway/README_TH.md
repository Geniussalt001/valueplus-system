# ValuePlus Drive Gateway

Gateway นี้เป็นทางเลือกเสริมสำหรับส่งและเปิด PDF ผ่าน Google Drive API โดยตรง
Apps Script และการทำงานเดิมยังเป็น fallback จนกว่าจะเปิดใช้ Gateway ครบทุกเครื่อง

## หลักความปลอดภัย

- ห้ามใส่ Google refresh token หรือ signing secret ลง source code
- Apps Script ออก token อายุ 15 นาทีหลังผู้ใช้ Login สำเร็จ
- Worker ตรวจ HMAC token ก่อนเข้าถึงไฟล์
- PDF ที่ Worker ส่งกลับกำหนด `private, no-store`
- โปรแกรมเก็บสำเนา PDF ใน local cache เพื่อให้เปิดครั้งถัดไปได้ทันที

## การตั้งค่า (ยังไม่ต้องทำระหว่างทดสอบระบบเดิม)

1. เปิด Google Drive API และสร้าง OAuth Client ชนิด Web application โดยเพิ่ม
   `https://developers.google.com/oauthplayground` เป็น Authorized redirect URI
2. ใช้ OAuth Playground พร้อม OAuth Client ของเราเพื่ออนุญาต scope
   `https://www.googleapis.com/auth/drive` แล้วเก็บ Refresh Token ไว้เป็นความลับ
3. คัดลอก `wrangler.toml.example` เป็น `wrangler.toml`
4. สร้าง signing secret แบบสุ่มอย่างน้อย 32 bytes และตั้ง Script Property ชื่อ
   `DRIVE_GATEWAY_SIGNING_SECRET`
5. ใส่ signing secret ค่าเดียวกันและ Google OAuth ทั้งสามค่าใน Worker:

   ```powershell
   npx wrangler secret put DRIVE_GATEWAY_SIGNING_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GOOGLE_REFRESH_TOKEN
   ```

6. Deploy Apps Script เวอร์ชันใหม่ก่อน เพื่อให้คำสั่ง `system.gatewayToken` พร้อมใช้งาน
7. Deploy Worker แล้วนำ URL ไปใส่ตอน build โปรแกรม:

   ```powershell
   $env:VITE_DRIVE_GATEWAY_URL="https://valueplus-drive-gateway.oilfacebook22.workers.dev"
   npm.cmd run tauri -- build
   ```

   หรือสร้างไฟล์ `.env.local` ที่โฟลเดอร์หลักของโปรเจกต์:

   ```env
   VITE_DRIVE_GATEWAY_URL=https://valueplus-drive-gateway.oilfacebook22.workers.dev
   ```

บน Windows สามารถเข้าโฟลเดอร์ `drive-gateway` แล้วรัน
`powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1` เพื่อช่วยตั้งค่าและ Deploy ได้

ถ้าไม่กำหนด `VITE_DRIVE_GATEWAY_URL` โปรแกรมจะใช้ Apps Script แบบเดิมทั้งหมด
ถ้า Gateway ยังเริ่มการส่งไฟล์ไม่ได้ โปรแกรมจะ fallback ไป Apps Script โดยอัตโนมัติ
แต่ถ้าเริ่มส่งไฟล์ขึ้น Drive แล้ว ระบบจะไม่ส่งไฟล์ซ้ำ และจะเก็บขั้นตอนลงทะเบียนข้อมูลไว้ในคิวซิงก์แทน

## ผลที่ได้เมื่อเปิดใช้

- PDF ไม่ต้องแปลงเป็น Base64 และวิ่งผ่าน Apps Script ระหว่างอัปโหลด
- หน้าออกใบจัดส่งพร้อมกันได้สูงสุด 6 ไฟล์ (โหมดเดิมคงไว้ที่ 3 ไฟล์)
- การเปิด PDF ครั้งแรกอ่านผ่าน Gateway และครั้งถัดไปอ่านจาก local cache
- Apps Script ยังดูแลสิทธิ์ สารบัญ Google Sheet โครงแฟ้ม และ fallback เดิม

## ลำดับการย้าย

1. เปิด Preview ผ่าน Gateway และตรวจ local cache
2. เปิด resumable upload เฉพาะหน้าทดสอบ
3. เพิ่มคำสั่ง register metadata ใน Apps Script โดยไม่ส่ง Base64
4. เมื่อผ่านการทดสอบ Office และ Headoffice จึงเปิดใช้กับทุกหน้า
