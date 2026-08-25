import {
  BarChart3,
  ClipboardList,
  Files,
  FolderArchive,
  Layers3,
  ReceiptText,
} from "lucide-react";

import type {
  SystemModule,
} from "../types/app";

export const systemModules:
  SystemModule[] = [
    {
      id: 1,
      route:
        "daily-picking",
      title:
        "ออกใบจัดรายวัน",
      subtitle:
        "DAILY PICKING",
      description:
        "อ่านข้อมูลจาก PDF จับคู่สินค้ากับ Template และจัดทำใบจัดสินค้าอัตโนมัติ",
      icon:
        ClipboardList,
      color:
        "#2389a8",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 2,
      route:
        "daily-posting",
      title:
        "ลงยอดรายวัน",
      subtitle:
        "POSTING CENTER",
      description:
        "ศูนย์รวมงานลงยอด SO ลูกหนี้–ค่าขนส่ง PO รีเทลขายเวิร์ลไวด์ และยอดขายรายเดือน",
      icon:
        Layers3,
      color:
        "#356bc4",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 3,
      route:
        "sales-billing",
      title:
        "เปิดบิลขายสินค้า",
      subtitle:
        "SALES BILLING",
      description:
        "ส่วนงานสำหรับเตรียม ตรวจสอบ และเปิดบิลขายสินค้า",
      icon:
        ReceiptText,
      color:
        "#159b82",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 4,
      route:
        "split-rename-po",
      title:
        "แยก และเปลี่ยนชื่อ PO",
      subtitle:
        "SPLIT & RENAME PO",
      description:
        "แยกเฉพาะหน้าที่มีรายการสินค้า เปลี่ยนชื่อไฟล์ และจัดเก็บตามวันที่เอกสาร PO",
      icon:
        Files,
      color:
        "#6a67c7",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 5,
      route:
        "daily-summary",
      title:
        "สรุปยอดรายวัน",
      subtitle:
        "DAILY SUMMARY",
      description:
        "เลือกสรุปยอด Express หรือสรุปยอดตุ๊กตา",
      icon:
        BarChart3,
      color:
        "#d18a18",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 7,
      route:
        "po-data",
      title:
        "แฟ้มบันทึกข้อมูล",
      subtitle:
        "DOCUMENT ARCHIVE CENTER",
      description:
        "ศูนย์รวมแฟ้มเอกสาร PO Seven ลูกหนี้ ค่าขนส่ง และแฟ้มงานสำหรับสำนักงานใหญ่",
      icon:
        FolderArchive,
      color:
        "#527187",
      status:
        "online",
      workspaces: [
        "retail",
        "head-office",
      ],
    },
  ];
