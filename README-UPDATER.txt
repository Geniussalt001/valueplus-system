ValuePlus System Automatic Updater
==================================

สิ่งที่ชุดติดตั้งนี้เพิ่ม
- GitHub Actions สำหรับ Build โปรแกรมบน Windows
- สร้าง NSIS Setup และลายเซ็น Tauri
- สร้าง latest.json อัตโนมัติ
- ส่ง Release ไปยัง Geniussalt001/valueplus-system-releases
- คำสั่ง PUBLISH-UPDATE.cmd สำหรับเพิ่มเวอร์ชัน Commit Tag และ Push
- คำสั่ง ROTATE-SIGNING-KEY.cmd สำหรับสร้างคู่กุญแจใหม่และตั้ง GitHub Secrets

การเริ่มระบบใหม่เมื่อไม่ใช้กุญแจเดิม
1. ติดตั้งชุดนี้ด้วย INSTALL-UPDATER.cmd
2. ดับเบิลคลิก ROTATE-SIGNING-KEY.cmd
3. ตั้งรหัสผ่านกุญแจใหม่ และเก็บไฟล์ Private Key ไว้ในที่ปลอดภัย
4. Script จะเปลี่ยน Public Key ใน tauri.conf.json
5. หากติดตั้ง GitHub CLI และ Login แล้ว Script จะตั้ง Signing Secrets ให้อัตโนมัติ
6. Commit และ Push ไฟล์ workflow กับ Public Key ใหม่
7. ใช้ PUBLISH-UPDATE.cmd ปล่อยเวอร์ชัน 1.0.3
8. ดาวน์โหลด Setup.exe จาก Release และติดตั้งด้วยมือทุกเครื่องหนึ่งครั้ง
9. ตั้งแต่ 1.0.4 เป็นต้นไป ใช้ปุ่มตรวจสอบอัปเดตในโปรแกรมได้

Secret ที่ต้องตั้งใน private repository: Geniussalt001/valueplus-system
1. RELEASE_TOKEN
   Fine-grained GitHub token ที่มีสิทธิ์ Contents: Read and write
   สำหรับ repository valueplus-system-releases

2. TAURI_SIGNING_PRIVATE_KEY
   เนื้อหา Private Key คู่เดิมของ Public Key ใน src-tauri/tauri.conf.json

3. TAURI_SIGNING_PRIVATE_KEY_PASSWORD
   รหัสผ่านของ Private Key หากไม่มีรหัสผ่านให้สร้าง Secret ค่าว่างไม่ได้
   ในกรณีนี้ให้ลบบรรทัด TAURI_SIGNING_PRIVATE_KEY_PASSWORD ออกจาก workflow

สำคัญมาก
- การหมุนกุญแจทำให้โปรแกรมเวอร์ชัน 1.0.2 ปฏิเสธไฟล์อัปเดตใหม่ตามที่ออกแบบไว้
- ต้องติดตั้งเวอร์ชันฐานใหม่ด้วยมือหนึ่งครั้งทุกเครื่อง
- ห้าม Commit Private Key หรือ Token ลง Git

การปล่อยเวอร์ชันหลังตั้ง Secret แล้ว
1. เปิดโฟลเดอร์ D:\valueplus-system
2. ตรวจให้ git status เป็น clean
3. ดับเบิลคลิก PUBLISH-UPDATE.cmd
4. ใส่เวอร์ชันใหม่ เช่น 1.0.3
5. รอ GitHub Actions ทำงานเสร็จ
6. เปิดโปรแกรมเวอร์ชันเก่าและกด ตรวจสอบอัปเดต
