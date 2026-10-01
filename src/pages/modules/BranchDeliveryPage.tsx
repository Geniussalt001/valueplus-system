import { useEffect, useState } from "react";
import { branchDeliveryService } from "../../services/branchDeliveryService";
import { salesBillingService, type SalesBillingProductMapping } from "../../services/salesBillingService";
import type { BranchDeliveryNote, BranchDeliveryStore, DeliveryBranch, DeliveryLine } from "../../types/branchDelivery";
import { deliveryPrintCss, renderDeliveryPages } from "../../services/branchDeliveryTemplate";
import "./branchDelivery.css";

const blankBranch = (): DeliveryBranch => ({ code: "", name: "", address: "", route: "" });
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function BranchDeliveryPage({ onBack, preparedBy }: { onBack: () => void; preparedBy: string }) {
  const [store, setStore] = useState<BranchDeliveryStore>({ branches: [], notes: [] });
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<SalesBillingProductMapping[]>([]);
  const [branch, setBranch] = useState<DeliveryBranch>(blankBranch);
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [remark, setRemark] = useState("");
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [preview, setPreview] = useState<BranchDeliveryNote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const draft = (): BranchDeliveryNote => ({ number: "", date, branch: { ...branch }, lines: lines.map(line => ({ ...line })), remark, preparedBy });
  async function load() {
    setError("");
    const results = await Promise.allSettled([branchDeliveryService.load(), salesBillingService.listProductMappings()]);
    if (results[0].status === "fulfilled") { setStore(results[0].value); setReady(true); }
    else { setReady(false); setError(`โหลดประวัติไม่สำเร็จ: ${String(results[0].reason)}`); }
    if (results[1].status === "fulfilled") setProducts(results[1].value.filter(product => product.cpall_code && product.pdf_name));
    else { const failure = String(results[1].reason); setError(current => `${current} โหลดฐานข้อมูลสินค้าไม่สำเร็จ: ${failure}`.trim()); }
  }
  useEffect(() => { void load(); }, []);
  function validate() {
    if (!branch.code.trim() || !branch.name.trim() || !branch.address.trim()) throw new Error("กรุณาระบุรหัสสาขา ชื่อสาขา และที่อยู่");
    if (!date || !Number.isFinite(new Date(`${date}T00:00:00`).getTime())) throw new Error("กรุณาระบุวันที่ส่ง");
    if (!lines.length) throw new Error("กรุณาเลือกสินค้าอย่างน้อยหนึ่งรายการ");
    if (lines.some(line => !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 999999 || Math.abs(line.quantity * 1000 - Math.round(line.quantity * 1000)) > 0.0001 || !line.unit.trim())) throw new Error("กรุณาระบุจำนวนมากกว่า 0 ทศนิยมไม่เกิน 3 ตำแหน่ง และหน่วยทุกรายการ");
  }
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (failure) { setError(String(failure instanceof Error ? failure.message : failure)); }
    finally { setBusy(false); }
  }
  function addProduct(product: SalesBillingProductMapping) {
    if (lines.length >= 240) { setError("เพิ่มสินค้าได้ไม่เกิน 240 รายการ"); return; }
    if (lines.some(line => line.code === product.cpall_code)) { setMessage("มีสินค้านี้แล้ว กรุณาแก้จำนวนในรายการเดิม"); return; }
    setLines(current => [...current, { code: product.cpall_code, name: product.pdf_name, quantity: 0, unit: "" }]);
    setSearch(""); setMessage("");
  }
  function editLine(index: number, patch: Partial<DeliveryLine>) { setLines(current => current.map((line, position) => position === index ? { ...line, ...patch } : line)); }
  const matchingProducts = products.filter(product => `${product.cpall_code} ${product.pdf_name} ${product.express_code}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="branch-delivery-page">
    <div className="bd-heading"><div><h2>ใบส่งของสาขา ไม่มีราคา</h2><p>เลือกสินค้าจากฐานข้อมูลเปิดบิลขาย กรอกจำนวนและหน่วย แล้วออกใบส่งของ A4</p></div><button onClick={onBack}>กลับแดชบอร์ด</button></div>
    {error && <div className="bd-error" role="alert">{error}</div>}
    {message && <div className="bd-message" role="status">{message}</div>}
    <div className="bd-card"><div className="bd-heading"><h3>สาขาและการจัดส่ง</h3><button disabled={busy} onClick={() => void action(load)}>โหลดข้อมูลใหม่</button></div>
      <label>เลือกสาขาที่บันทึกไว้<select value={store.branches.some(item => item.code === branch.code) ? branch.code : ""} onChange={event => setBranch({ ...(store.branches.find(item => item.code === event.target.value) || blankBranch()) })}><option value="">เพิ่มสาขาใหม่</option>{store.branches.map(item => <option key={item.code} value={item.code}>{item.code} — {item.name} {item.route && `(${item.route})`}</option>)}</select></label>
      <div className="bd-grid"><label>รหัสสาขา<input maxLength={100} value={branch.code} onChange={event => setBranch({ ...branch, code: event.target.value })}/></label><label>ชื่อสาขา<input maxLength={100} value={branch.name} onChange={event => setBranch({ ...branch, name: event.target.value })}/></label><label>วันที่ส่ง<input type="date" min="2000-01-01" max="2200-12-31" value={date} onChange={event => setDate(event.target.value)}/></label><label>Route<input maxLength={100} value={branch.route} onChange={event => setBranch({ ...branch, route: event.target.value })}/></label></div>
      <label>ที่อยู่จัดส่ง<textarea rows={2} maxLength={300} value={branch.address} onChange={event => setBranch({ ...branch, address: event.target.value })}/></label>
      <button disabled={busy || !ready} onClick={() => void action(async () => { const updated = await branchDeliveryService.saveBranch(branch); setStore(updated); setMessage("บันทึกข้อมูลสาขาแล้ว เลือกใช้ครั้งต่อไปได้"); })}>บันทึกสาขาไว้ใช้ซ้ำ</button>
    </div>
    <div className="bd-card"><h3>รายการสินค้า</h3><label>ค้นหารหัส CPALL / รหัส Express / ชื่อสินค้า<input value={search} placeholder="พิมพ์เพื่อค้นหาสินค้า" onChange={event => setSearch(event.target.value)}/></label>
      {search.trim() && <div className="bd-results">{matchingProducts.slice(0, 30).map((product, index) => <button key={`${product.cpall_code}-${index}`} onClick={() => addProduct(product)}><strong>{product.cpall_code}</strong> {product.pdf_name} <small>Express: {product.express_code || "-"}</small></button>)}{!matchingProducts.length && <p>ไม่พบสินค้าในฐานข้อมูล</p>}{matchingProducts.length > 30 && <p>พบ {matchingProducts.length} รายการ โปรดระบุคำค้นเพิ่ม</p>}</div>}
      <div className="bd-table-wrap"><table><thead><tr><th>ลำดับ</th><th>รหัส / รายการสินค้า</th><th>จำนวน</th><th>หน่วย</th><th></th></tr></thead><tbody>{lines.map((line, index) => <tr key={line.code}><td>{index + 1}</td><td><small>{line.code}</small><br/>{line.name}</td><td><input aria-label={`จำนวน ${line.name}`} type="number" min="0.001" max="999999" step="0.001" value={line.quantity || ""} onChange={event => editLine(index, { quantity: event.target.valueAsNumber })}/></td><td><select aria-label={`หน่วย ${line.name}`} value={line.unit} onChange={event => editLine(index, { unit: event.target.value })}><option value="">เลือกหน่วย</option>{["ชิ้น", "ลัง", "แพ็ก", "กล่อง", "ถุง"].map(unit => <option key={unit}>{unit}</option>)}</select></td><td><button onClick={() => setLines(current => current.filter((_, position) => position !== index))}>ลบ</button></td></tr>)}</tbody></table></div>
      {!lines.length && <p className="bd-muted">ยังไม่มีสินค้า ค้นหาและเลือกจากฐานข้อมูลด้านบน</p>}
      <label>หมายเหตุ<textarea maxLength={180} value={remark} onChange={event => setRemark(event.target.value)}/></label>
      <div className="bd-actions"><button disabled={busy} onClick={() => { try { validate(); setError(""); setPreview(draft()); } catch (failure) { setError(String(failure instanceof Error ? failure.message : failure)); } }}>ดูตัวอย่าง</button><button className="bd-primary" disabled={busy || !ready} onClick={() => void action(async () => { validate(); const updated = await branchDeliveryService.saveNote(draft()); setStore(updated); setPreview(updated.notes[0]); setLines([]); setRemark(""); setMessage(`บันทึก ${updated.notes[0].number} แล้ว สามารถพิมพ์จากตัวอย่างหรือประวัติได้`); })}>{busy ? "กำลังดำเนินการ…" : "บันทึกใบส่งของ"}</button></div>
    </div>
    <div className="bd-card"><h3>ประวัติใบส่งของ ({store.notes.length})</h3><p className="bd-muted">ข้อมูลสาขาและประวัติเก็บในเครื่องนี้ การคัดลอกจะสร้างเลขเอกสารใหม่เมื่อบันทึก</p><label>ค้นหาเลขเอกสาร / สาขา / วันที่ / Route<input value={historySearch} onChange={event => setHistorySearch(event.target.value)}/></label>
      {store.notes.filter(note => `${note.number} ${note.date} ${note.branch.code} ${note.branch.name} ${note.branch.route}`.toLowerCase().includes(historySearch.toLowerCase())).map(note => <div className="bd-history" key={note.number}><div><strong>{note.number}</strong><p>{note.date} · {note.branch.code} {note.branch.name} · Route {note.branch.route || "-"}</p></div><div className="bd-actions"><button onClick={() => setPreview(note)}>ดู / พิมพ์</button><button onClick={() => { setBranch({ ...note.branch }); setDate(today()); setLines(note.lines.map(line => ({ ...line }))); setRemark(note.remark); setMessage("คัดลอกแล้ว กรุณาตรวจสาขา วันที่ และจำนวนก่อนบันทึก"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>คัดลอกใบเดิม</button></div></div>)}
      {ready && !store.notes.length && <p className="bd-muted">ยังไม่มีใบส่งของที่บันทึก</p>}
    </div>
    {preview && <div className="bd-modal" role="dialog" aria-modal="true" aria-label="ตัวอย่างใบส่งของ"><div className="bd-modal-toolbar"><strong>{preview.number || "ตัวอย่างก่อนบันทึก"}</strong><span>{preview.number ? "เปิดในเบราว์เซอร์ แล้วเลือกพิมพ์หรือ Save as PDF" : "บันทึกก่อนเพื่อรับเลขที่เอกสาร"}</span>{preview.number && <button disabled={busy} onClick={() => void action(async () => { await branchDeliveryService.print(preview); setMessage("เปิดเอกสารสำหรับพิมพ์แล้ว เลือก Save as PDF เพื่อบันทึก PDF"); })}>พิมพ์ / บันทึก PDF</button>}<button onClick={() => setPreview(null)}>ปิด</button>{error && <div className="bd-error" role="alert">{error}</div>}</div><iframe title="ตัวอย่างใบส่งของ A4" sandbox="" srcDoc={`<!doctype html><html lang="th"><meta charset="utf-8"><style>${deliveryPrintCss}</style><body>${renderDeliveryPages(preview, new URL("/images/valueplus-logo.png", window.location.href).href)}</body></html>`}/></div>}
  </section>;
}
