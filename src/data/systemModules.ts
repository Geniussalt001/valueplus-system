import {
  BarChart3,
  ClipboardList,
  Database,
  FileSpreadsheet,
  Files,
  PackageSearch,
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
        "แยก และเปลี่ยนชื่อ PO",
      subtitle:
        "SPLIT & RENAME PO",
      description:
        "แยกเฉพาะหน้าที่มีรายการสินค้า เปลี่ยนชื่อไฟล์ และจัดเก็บตามวันที่เอกสาร PO",
      icon:
        Files,
      color:
        "#22d3ee",
      status:
        "online",
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
        "#38bdf8",
      status:
        "online",
    },

    {
      id: 3,
      route:
        "split-rename-po",
      title:
        "ออกใบจัดรายวัน",
      subtitle:
        "DAILY PICKING",
      description:
        "อ่านข้อมูลจาก PDF จับคู่สินค้ากับ Template และจัดทำใบจัดสินค้าอัตโนมัติ",
      icon:
        ClipboardList,
      color:
        "#60a5fa",
      status:
        "online",
    },

    {
      id: 4,
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
        "#a78bfa",
      status:
        "online",
    },

    {
      id: 5,
      route:
        "po-data",
      title:
        "ระบบลงข้อมูล PO",
      subtitle:
        "PO DATA SYSTEM",
      description:
        "ลงทะเบียน ติดตาม และตรวจสอบสถานะเอกสาร PO",
      icon:
        Database,
      color:
        "#34d399",
      status:
        "online",
    },

    {
      id: 6,

      route:
        "product-catalog",

      title:
        "จัดการข้อมูลสินค้า",

      subtitle:
        "PRODUCT CATALOG",

      description:
        "เพิ่ม แก้ไข เปิด ปิด และกำหนดชื่อสินค้าสำหรับสรุปยอด",

      icon:
        PackageSearch,

      color:
        "#2dd4bf",

      status:
        "online",
    },

  ];
