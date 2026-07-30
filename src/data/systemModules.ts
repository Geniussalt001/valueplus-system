import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  Files,
  FolderArchive,
  Globe2,
  HandCoins,
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
        "#00c7ed",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 2,
      route:
        "daily-so",
      title:
        "ลงยอด SO รายวัน",
      subtitle:
        "DAILY SO IMPORT",
      description:
        "อ่าน PO จับคู่สินค้า รวมยอด และสร้างไฟล์ Q19 กับ Q20 อัตโนมัติ",
      icon:
        FileSpreadsheet,
      color:
        "#247bff",
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
        "#0f9f8f",
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
        "#5965d8",
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
        "#e58a00",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 6,
      route:
        "receivables-freight",
      title:
        "ลงยอดลูกหนี้–ค่าขนส่ง",
      subtitle:
        "RECEIVABLES & FREIGHT",
      description:
        "บันทึก ตรวจสอบ และติดตามยอดลูกหนี้กับค่าขนส่ง",
      icon:
        HandCoins,
      color:
        "#0891b2",
      status:
        "online",
      workspaces: [
        "retail",
      ],
    },

    {
      id: 8,
      route:
        "retail-worldwide-po",
      title:
        "ลงยอด PO รีเทล ขายเวิร์ลไวด์",
      subtitle:
        "RETAIL WORLDWIDE PO",
      description:
        "พื้นที่เตรียมระบบสำหรับลงยอดและจัดการข้อมูล PO รีเทลขายเวิร์ลไวด์",
      icon:
        Globe2,
      color:
        "#6551bd",
      status:
        "offline",
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
        "#0e7490",
      status:
        "online",
      workspaces: [
        "retail",
        "head-office",
      ],
    },
  ];
