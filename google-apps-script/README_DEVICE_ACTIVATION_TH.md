# ระบบเปิดใช้งานเครื่องครั้งแรก

ระบบนี้ไม่ฝัง API Token หลักไว้ในไฟล์ EXE แต่จะออก Device Token
แยกให้แต่ละเครื่อง และเก็บ Token ไว้ใน Windows Credential Manager

## ตั้งค่า Apps Script

1. เพิ่มไฟล์ `DeviceAccessService.gs` เข้าไปในโปรเจกต์ Apps Script เดิม
2. แทนที่ `Router.gs` ด้วยไฟล์เวอร์ชันล่าสุดในโฟลเดอร์นี้
3. เปิด Project Settings > Script Properties
4. เพิ่ม Property ชื่อ `ACTIVATION_CODE` และใส่รหัสเปิดใช้งานที่ตกลงกัน
5. รัน `setupDeviceAccessSystem()` หนึ่งครั้งและอนุญาตสิทธิ์
6. Deploy > Manage deployments > Edit > New version > Deploy

หลังติดตั้ง EXE เครื่องใหม่ โปรแกรมจะถามรหัสเพียงครั้งแรก จากนั้นผู้ใช้
เลือก Office หรือ Head Office ได้ตามปกติ

## ยกเลิกสิทธิ์เครื่อง

เปิดชีต `DEVICE_ACCESS` แล้วเปลี่ยนค่า `ACTIVE` ของเครื่องนั้นเป็น
`FALSE` ภายในไม่เกิน 10 นาทีเครื่องดังกล่าวจะต้องกรอกรหัสใหม่
