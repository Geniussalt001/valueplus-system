ValuePlus System Automatic Updater
==================================

สิ่งที่ชุดติดตั้งนี้เพิ่ม
- GitHub Actions สำหรับ Build โปรแกรมบน Windows
- สร้าง NSIS Setup และลายเซ็น Tauri
- สร้าง latest.json อัตโนมัติ
- ส่ง Release ไปยัง Geniussalt001/valueplus-system-releases
- คำสั่ง PUBLISH-UPDATE.cmd สำหรับเพิ่มเวอร์ชัน Commit Tag และ Push

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
- ห้ามสร้าง Signing Key ใหม่ หากมีโปรแกรมเวอร์ชัน 1.0.2 ติดตั้งใช้งานอยู่แล้ว
- ต้องใช้ Private Key คู่เดิม มิฉะนั้นโปรแกรมเดิมจะปฏิเสธไฟล์อัปเดต
- ห้าม Commit Private Key หรือ Token ลง Git

การปล่อยเวอร์ชันหลังตั้ง Secret แล้ว
1. เปิดโฟลเดอร์ D:\valueplus-system
2. ตรวจให้ git status เป็น clean
3. ดับเบิลคลิก PUBLISH-UPDATE.cmd
4. ใส่เวอร์ชันใหม่ เช่น 1.0.3
5. รอ GitHub Actions ทำงานเสร็จ
6. เปิดโปรแกรมเวอร์ชันเก่าและกด ตรวจสอบอัปเดต
