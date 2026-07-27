from __future__ import annotations

from .models import ProductItem


# โปรไฟล์ BALANCED SAFE สำหรับ Express ที่ทำงานผ่าน Remote Desktop
# เร็วขึ้นเฉพาะจังหวะทั่วไป แต่คงช่วงรอจุดเสี่ยงไว้
DEFAULT_KEY_DELAY = 0.06
DEFAULT_FIELD_DELAY = 0.15
FOCUS_SETTLE_DELAY = 0.05
ORDER_START_SETTLE_DELAY = 0.20
NEW_INVOICE_SETTLE_DELAY = 1.50
HEADER_FIELD_SETTLE_DELAY = 0.12
IV_FIELD_SETTLE_DELAY = 0.35
SALES_AREA_SETTLE_DELAY = 0.30
AFTER_INVOICE_SAVE_DELAY = 0.45

# ช่องวันที่เป็น masked input ของ Express ต้องล้างและคีย์ทีละหลัก
DATE_SELECT_DELAY = 0.20
DATE_DELETE_DELAY = 0.20
DATE_DIGIT_DELAY = 0.12
DATE_VALUE_SETTLE_DELAY = 0.35

# Express ตอบสนองต่อรหัสสินค้าใหม่บางรายการช้ากว่าปกติ โดยเฉพาะ
# 6002799 ซึ่งในเอกสารชุดใหม่มีสินค้ารายการถัดไปต่อท้าย หากส่ง Enter
# เร็วเกินไป Express จะยังไม่ยืนยันแถวและรหัสถัดไปอาจทับรายการเดิม
DEFAULT_ITEM_CODE_SETTLE_DELAY = 0.22
ITEM_CODE_SETTLE_DELAYS = {
    "6002799": 0.60,
}

# ช่องคลังใน Express ต้องรอให้การเลือก/ลบ/ใส่ค่าเสร็จเป็นขั้น ๆ
WAREHOUSE_SELECT_DELAY = 0.20
WAREHOUSE_DELETE_DELAY = 0.20
WAREHOUSE_VALUE_SETTLE_DELAY = 0.35

# รายการสุดท้ายต้องให้ Express ยืนยันแถวและราคาก่อนสั่งบันทึก IV
LAST_ITEM_SETTLE_DELAY = 1.00
BETWEEN_SAVE_ESC_DELAY = 0.25


def item_code_settle_delay(item: ProductItem) -> float:
    return ITEM_CODE_SETTLE_DELAYS.get(
        item.cpall_code,
        DEFAULT_ITEM_CODE_SETTLE_DELAY,
    )
