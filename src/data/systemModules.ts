import {
  BarChart3,
  ClipboardList,
  Database,
  FileSpreadsheet,
  Files,
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
        "จัดเตรียม ตรวจสอบ และสร้างรายงานใบจัดสินค้าประจำวัน",

      icon:
        ClipboardList,

      color:
        "#22d3ee",

      status:
        "offline",
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
        "ประมวลผลเอกสารและนำข้อมูลยอดขายเข้าสู่ระบบ",

      icon:
        FileSpreadsheet,

      color:
        "#38bdf8",

      status:
        "offline",
    },

    {
      id: 3,

      route:
        "split-rename-po",

      title:
        "แยก และเปลี่ยนชื่อ PO",

      subtitle:
        "SPLIT & RENAME PO",

      description:
        "อ่านข้อมูลจาก PDF จับคู่สินค้ากับ Template และจัดทำใบจัดสินค้าอัตโนมัติ",

      icon:
        Files,

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
        "รวบรวม ตรวจสอบ และสรุปผลการดำเนินงานประจำวัน",

      icon:
        BarChart3,

      color:
        "#a78bfa",

      status:
        "offline",
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
  ];