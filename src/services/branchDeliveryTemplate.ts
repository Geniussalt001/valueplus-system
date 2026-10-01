import type { BranchDeliveryNote } from "../types/branchDelivery";

export const deliveryPrintCss = `
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}body{margin:0;background:#eee;color:#111;font-family:Tahoma,"Noto Sans Thai",sans-serif;font-size:11px}
.delivery-sheet{width:190mm;margin:10px auto;background:white;padding:4mm;page-break-after:always;break-after:page}
.delivery-sheet:last-child{page-break-after:auto;break-after:auto}
.delivery-header{display:flex;align-items:center;gap:12px;height:27mm}.delivery-logo{width:32mm}.delivery-company{flex:1}.delivery-company strong{font-size:15px}.delivery-title{font-size:18px;text-align:right;margin:8px 0}
.delivery-boxes{display:grid;grid-template-columns:1fr 1fr;gap:5px}.delivery-box{border:1px solid;border-radius:7px;padding:10px;min-height:36mm;overflow-wrap:anywhere}.delivery-box p{margin:5px 0;white-space:pre-wrap}
.delivery-items{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:5px}.delivery-items th,.delivery-items td{border:1px solid;padding:6px}.delivery-items th{height:10mm}.delivery-items td{height:9mm;overflow-wrap:anywhere}.delivery-items .item-description{font-size:11px}.delivery-items small{display:block;color:#444}.delivery-items .center{text-align:center}
.delivery-remark{border:1px solid;border-top:0;padding:8px;min-height:18mm;white-space:pre-wrap;overflow-wrap:anywhere}.delivery-signatures{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid;border-radius:7px;margin-top:6px;text-align:center}.delivery-signatures>div{padding:8px;border-right:1px solid;min-height:30mm}.delivery-signatures>div:last-child{border:0}.delivery-signatures p{margin:9px 0}.delivery-footer{text-align:right;margin-top:6px;font-size:10px}
.delivery-toolbar{text-align:center;padding:15px;font-size:14px}.delivery-toolbar button{padding:10px 20px;cursor:pointer}
@media print{body{background:white}.delivery-toolbar{display:none}.delivery-sheet{margin:0;padding:4mm}}
`;
export function escapeDeliveryText(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export function renderDeliveryPages(note: BranchDeliveryNote, logo: string): string {
  const e = escapeDeliveryText;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(note.date) ? `${note.date.slice(8)}/${note.date.slice(5, 7)}/${Number(note.date.slice(0, 4)) + 543}` : note.date;
  const pages = Math.max(1, Math.ceil(note.lines.length / 12));
  return Array.from({ length: pages }, (_, page) => {
    const rows = Array.from({ length: 12 }, (_, index) => {
      const line = note.lines[page * 12 + index];
      return line ? `<tr><td class="center">${page * 12 + index + 1}</td><td class="item-description"><small>${e(line.code)}</small>${e(line.name)}</td><td class="center">${line.quantity.toLocaleString("th-TH", { maximumFractionDigits: 3 })}</td><td class="center">${e(line.unit)}</td></tr>` : "<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>";
    }).join("");
    return `<section class="delivery-sheet"><div class="delivery-header"><img class="delivery-logo" src="${e(logo)}" alt="ValuePlus"><div class="delivery-company"><strong>บริษัท แวลู่พลัส รีเทล จำกัด (สำนักงานใหญ่)</strong><p>1151/3 ถนนนครไชยศรี แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400</p><p>เลขประจำตัวผู้เสียภาษี 0105567047303</p></div></div><h1 class="delivery-title">ใบส่งของชั่วคราว</h1><div class="delivery-boxes"><div class="delivery-box"><p>รหัสสาขา: <strong>${e(note.branch.code)}</strong></p><p><strong>7-Eleven ${e(note.branch.name)}</strong></p><p>${e(note.branch.address)}</p></div><div class="delivery-box"><p>เลขที่: <strong>${e(note.number || "ตัวอย่างก่อนบันทึก")}</strong></p><p>วันที่ส่ง: ${e(date)}</p><p>Route: ${e(note.branch.route || "-")}</p><p>ผู้จัดทำ: ${e(note.preparedBy)}</p></div></div><table class="delivery-items"><colgroup><col style="width:10%"><col style="width:62%"><col style="width:15%"><col style="width:13%"></colgroup><thead><tr><th>ลำดับ</th><th>รหัสสินค้า / รายละเอียด</th><th>จำนวน</th><th>หน่วย</th></tr></thead><tbody>${rows}</tbody></table><div class="delivery-remark">หมายเหตุ: ${e(note.remark || "-")}</div><div class="delivery-signatures"><div><strong>ได้รับสินค้าตามรายการแล้ว</strong><p>....................................</p><p>ผู้รับสินค้า</p><p>วันที่ ....../....../...... เวลา ..........</p></div><div><strong>ผู้ส่งสินค้า</strong><p>....................................</p><p>ผู้ส่งสินค้า / Delivery by</p><p>วันที่ ....../....../......</p></div><div><strong>บริษัท แวลู่พลัส รีเทล จำกัด</strong><p>....................................</p><p>ผู้อนุมัติ</p><p>ผู้จัดทำ: ${e(note.preparedBy)}</p></div></div><div class="delivery-footer">${e(note.number || "ตัวอย่าง")} · หน้า ${page + 1} / ${pages}</div></section>`;
  }).join("");
}
export function renderDeliveryHtml(note: BranchDeliveryNote, logo: string): string {
  return `<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>${escapeDeliveryText(note.number)} ใบส่งของ</title><style>${deliveryPrintCss}</style></head><body><div class="delivery-toolbar"><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button><p>เลือกกระดาษ A4 ขนาด 100% และปิดหัวกระดาษ/ท้ายกระดาษของเบราว์เซอร์</p></div>${renderDeliveryPages(note, logo)}</body></html>`;
}
