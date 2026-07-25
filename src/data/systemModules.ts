import {
  BarChart3,
  ClipboardList,
  FolderArchive,
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
        "#00c7ed",
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
        "#247bff",
      status:
        "online",
    },

    {
      id: 3,
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
        "#5965d8",
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
        "#e58a00",
      status:
        "online",
    },

    {
      id: 5,
      route:
        "po-data",
      title:
        "แฟ้มบันทึกข้อมูล",
      subtitle:
        "PO DOCUMENT ARCHIVE",
      description:
        "จัดเก็บ ค้นหา และเปิดเอกสาร PO จาก Google Drive สำหรับสำนักงานใหญ่",
      icon:
        FolderArchive,
      color:
        "#0e7490",
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
        "#00b887",

      status:
        "online",
    },

  ];
