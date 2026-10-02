import type { BranchDeliveryNote, DeliveryLine } from "../types/branchDelivery";

export const deliveryPrintCss = `
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}body{margin:0;background:#eee;color:#111;font-family:Tahoma,"Noto Sans Thai",sans-serif;font-size:11px}
.delivery-sheet{width:190mm;margin:10px auto;background:white;padding:4mm;break-after:page}.delivery-sheet:last-child{break-after:auto}
.delivery-title{text-align:center;font-size:21px;margin:0 0 14px}.delivery-company{font-size:13px;margin:5px 0;text-align:center}.delivery-address{text-align:center}.delivery-topline{display:flex;justify-content:space-between;margin:12px 0 8px}.delivery-meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}.delivery-meta .wide{grid-column:1/-1;white-space:pre-wrap;overflow-wrap:anywhere}
.delivery-items{width:100%;border-collapse:collapse;table-layout:fixed}.delivery-items th{border-top:1px solid;border-bottom:1px solid;padding:6px 3px}.delivery-items td{height:6.5mm;padding:3px;font-size:10px;overflow-wrap:anywhere;vertical-align:middle}.delivery-items .center{text-align:center}.delivery-items tfoot td{border-top:1px solid;border-bottom:1px solid;height:9mm}.delivery-items small{font-size:9px}
.delivery-signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:16px 0}.delivery-signatures>div{font-size:10px;text-align:center;overflow-wrap:anywhere}.delivery-signatures p{margin:8px 0}.delivery-notes{font-size:10px;line-height:1.6}.delivery-notes p{margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere}.delivery-toolbar{text-align:center;padding:15px;font-size:14px}.delivery-toolbar button{padding:10px 20px;cursor:pointer}
@media print{body{background:white}.delivery-toolbar{display:none}.delivery-sheet{margin:0}}
`;
export function escapeDeliveryText(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
function displayQuantity(value: number | undefined): string {
  return value === undefined ? "" : value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}
function totals(lines: DeliveryLine[], ordered: boolean): string {
  if (ordered && lines.some(line => line.orderedQuantity === undefined)) return "ไม่ครบ";
  const byUnit = new Map<string, number>();
  for (const line of lines) byUnit.set(line.unit, (byUnit.get(line.unit) || 0) + (ordered ? line.orderedQuantity ?? 0 : line.quantity));
  return Array.from(byUnit, ([unit, value]) => `${displayQuantity(value)} ${escapeDeliveryText(unit)}`).join("<br>");
}
export function renderDeliveryPages(note: BranchDeliveryNote, _logo = ""): string {
  const e = escapeDeliveryText;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(note.date) ? `${note.date.slice(8)}/${note.date.slice(5, 7)}/${Number(note.date.slice(0, 4)) + 543}` : note.date;
  const pages = Math.max(1, Math.ceil(note.lines.length / 20));
  return Array.from({ length: pages }, (_, page) => {
    const pageLines = note.lines.slice(page * 20, (page + 1) * 20);
    const rows = Array.from({ length: 20 }, (_, index) => {
      const line = pageLines[index];
      return line ? `<tr><td class="center">${page * 20 + index + 1}</td><td class="center">${e(line.code)}</td><td>${e(line.name)}</td><td class="center">${e(line.packSize || "")}<br><small>${e(line.unit)}</small></td><td class="center">${displayQuantity(line.orderedQuantity)}</td><td class="center">${displayQuantity(line.quantity)}</td></tr>` : "<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>";
    }).join("");
    return `<section class="delivery-sheet"><h1 class="delivery-title">ใบนำส่งสินค้าชั่วคราว</h1><p class="delivery-company"><strong>บริษัท แวลู่พลัส รีเทล จำกัด (สำนักงานใหญ่)</strong></p><p class="delivery-address">1151/3 ถนนนครไชยศรี แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400</p><div class="delivery-topline"><span>เลขที่ ${e(note.number || "ตัวอย่างก่อนบันทึก")}</span><span>หน้า ${page + 1}/${pages} &nbsp; ใบส่งสินค้า</span></div><div class="delivery-meta"><div>BDC จาก : <strong>${e(note.branch.bdc || "-")}</strong></div><div>Route : ${e(note.branch.route || "-")}</div><div>Vendor : ${e(note.vendor || "-")}</div><div>วันที่ : ${e(date)}</div><div class="wide">ถึงสาขา : <strong>${e(note.branch.code)} &nbsp; ${e(note.branch.name)}</strong></div></div><table class="delivery-items"><colgroup><col style="width:7%"><col style="width:13%"><col style="width:43%"><col style="width:15%"><col style="width:11%"><col style="width:11%"></colgroup><thead><tr><th>ลำดับ</th><th>รหัสสินค้า</th><th>รายการ</th><th>ขนาดบรรจุ</th><th>สั่ง</th><th>ส่ง</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="text-align:right">${pages > 1 ? "รวมหน้านี้" : "รวม"}</td><td class="center">${totals(pageLines, true)}</td><td class="center">${totals(pageLines, false)}</td></tr></tfoot></table><div class="delivery-signatures"><div><p>ชื่อ ${e(note.preparedBy)}</p><p>บริษัท แวลู่พลัส รีเทล จำกัด</p></div><div><p>................................................</p><p>ผู้ส่งสินค้า ....../....../............</p></div><div><p>................................................</p><p>ผู้รับสินค้า ....../....../............</p></div></div><div class="delivery-notes"><p>หมายเหตุ : 1.ใบส่งสินค้าชั่วคราว ใช้เพื่อเป็นหลักฐานยืนยัน ในการนำส่ง PO และ Invoice ตัวจริง ที่จะนำส่งให้คลัง</p><p>2.นำใบส่งสินค้าชั่วคราว พร้อม Po และ Invoice ยื่นบิล ณ คลังในวันถัดไปตาม window time</p>${note.remark ? `<p>เพิ่มเติม : ${e(note.remark)}</p>` : ""}</div></section>`;
  }).join("");
}
export function renderDeliveryHtml(note: BranchDeliveryNote, _logo = ""): string {
  return `<!doctype html><html lang="th"><head><meta charset="UTF-8"><title>${escapeDeliveryText(note.number)} ใบนำส่งสินค้าชั่วคราว</title><style>${deliveryPrintCss}</style></head><body><div class="delivery-toolbar"><button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button><p>เลือกกระดาษ A4 ขนาด 100% และปิดหัวกระดาษ/ท้ายกระดาษของเบราว์เซอร์</p></div>${renderDeliveryPages(note)}</body></html>`;
}
