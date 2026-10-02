import { useEffect, useState } from "react";
import { hubDeliveryService as service } from "../../services/hubDeliveryService";
import type { HubBranch, HubSettings, HubStore } from "../../types/hubDelivery";
import "./hubDelivery.css";

const routeColors = ["#4472C4", "#70AD47", "#ED7D31", "#8064A2", "#00A6A6"];
function today() { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); return ["year", "month", "day"].map(name => parts.find(p => p.type === name)?.value).join("-"); }
function thaiDate(date: string) { return new Date(date+"T12:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }); }
const total = (branch: HubBranch) => branch.items.reduce((sum, item) => sum + item.quantity, 0);

export function HubDeliveryPage({ onBack, initialStore }: { onBack: () => void; initialStore?: HubStore }) {
  const [store, setStore] = useState<HubStore | null>(initialStore || null);
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState<string[]>(() => initialStore?.branches.filter(b => b.ready && !b.flood).map(b => b.code) || []);
  const [route, setRoute] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<HubSettings | null>(initialStore?.settings || null);
  const [detail, setDetail] = useState<HubBranch | null>(null);
  const [file, setFile] = useState("");
  function apply(result: HubStore, resetSelection = false) { setStore(result); setSettings({ ...result.settings }); if (resetSelection) setSelected(result.branches.filter(b => b.ready && !b.flood).map(b => b.code)); }
  async function act(work: () => Promise<void>) { if (busy) return; setBusy(true); setError(""); setMessage(""); try { await work(); } catch (e) { setError(String(e instanceof Error ? e.message : e)); } finally { setBusy(false); } }
  useEffect(() => { if (!initialStore) void act(async () => apply(await service.load(), true)); }, []);
  const visible = (store?.branches || []).filter(b => (route === "all" || b.route === route) && `${b.code} ${b.name} ${b.bdc}`.toLowerCase().includes(search.toLowerCase()));
  const chosen = (store?.branches || []).filter(b => selected.includes(b.code));
  const routes = [...new Set((store?.branches || []).filter(b => !b.flood).map(b => b.route))].sort((a,b) => Number(a)-Number(b));
  return <section className="hub-page">
    <header className="hub-heading"><div><span className="hub-eyebrow">ValuePlus · งานจัดส่งสาขา</span><h2>ใบส่งของ HUB</h2><p>ใช้ข้อมูลล่าสุดที่บันทึกไว้ เลือกวันที่และสาขา แล้วออกไฟล์ Excel</p></div><button onClick={onBack}>กลับแดชบอร์ด</button></header>
    {error && <div className="hub-error" role="alert">{error}</div>}
    {message && <div className="hub-success" role="status">{message}</div>}
    {!store && !busy && <button onClick={() => void act(async () => apply(await service.load(), true))}>ลองโหลดอีกครั้ง</button>}
    <fieldset disabled={busy || !store} className="hub-controls">
    <div className="hub-layout"><div className="hub-main">
      <section className="hub-card"><div className="hub-section-title"><h3>1. ข้อมูล HUB</h3><button onClick={() => void act(async () => { const path = await service.selectFile(); if (path) { apply(await service.importSource(path), true); setFile(""); setMessage("บันทึกไฟล์ล่าสุดแล้ว เลือกเฉพาะสาขาสีเขียวเต็มแถวให้อัตโนมัติ"); } })}>{store?.source ? "เปลี่ยนไฟล์ข้อมูล" : "แนบไฟล์ HUB"}</button></div>
        {store?.source ? <div className="hub-source"><strong>{store.source.name}</strong><p>นำเข้า {new Date(store.source.importedAt).toLocaleString("th-TH")} · {store.branches.length} สาขา · พร้อมส่ง {store.branches.filter(b => b.ready).length} สาขา</p></div> : <div className="hub-empty">แนบ Excel ที่มีชีท “Hub สินค้า Dry” ครั้งแรก เพื่อบันทึกสาขา สินค้า และยอดประจำวัน</div>}
        <p className="hub-hint">แนบใหม่เมื่อข้อมูลเปลี่ยนเท่านั้น สีเขียวเต็มแถวคือสาขาพร้อมส่ง สีเฉพาะช่องรหัสสาขาไม่นับเป็นพร้อมส่ง</p>
      </section>
      <section className="hub-card"><div className="hub-section-title"><h3>2. สาขาที่จะส่ง</h3><span>{selected.length} สาขาที่เลือก</span></div>
        <div className="hub-filters"><label>ค้นหาสาขา<input value={search} onChange={e => setSearch(e.target.value)} placeholder="รหัสสาขา / ชื่อสาขา / BDC" /></label><label>รูท<select value={route} onChange={e => setRoute(e.target.value)}><option value="all">ทุกรูท</option>{routes.map(r => <option key={r} value={r}>รูท {r}</option>)}</select></label></div>
        <div className="hub-selection"><button onClick={() => setSelected((store?.branches || []).filter(b => b.ready && !b.flood).map(b => b.code))}>เลือกสาขาพร้อมส่ง</button><button onClick={() => setSelected(current => [...new Set([...current, ...visible.filter(b => !b.flood).map(b => b.code)])])}>เลือกทั้งหมดที่แสดง</button><button onClick={() => setSelected([])}>ล้างที่เลือก</button></div>
        <div className="hub-table"><table><thead><tr><th>เลือก</th><th>สาขา</th><th>BDC</th><th>รูท</th><th>สถานะ</th><th>ยอด PAC</th><th>สินค้า</th></tr></thead><tbody>{visible.map(b => <tr key={b.code} className={selected.includes(b.code) ? "hub-selected" : ""}><td><input type="checkbox" aria-label={`เลือกสาขา ${b.code}`} disabled={b.flood} checked={selected.includes(b.code)} onChange={e => setSelected(current => e.target.checked ? [...current, b.code] : current.filter(c => c !== b.code))}/></td><td><strong>{b.code}</strong><span className="hub-branch-name">{b.name}</span></td><td>{b.bdc || "—"}</td><td><span className="hub-route-dot" style={{ background: routeColors[(Number(b.route)-1) % 5] || "#888" }}/>{b.route}</td><td><span className={`hub-status ${b.ready ? "ready" : ""}`}>{b.flood ? "เสี่ยงน้ำท่วม" : b.ready ? "พร้อมส่ง" : "ไม่ได้ระบุพร้อมส่ง"}</span></td><td className="hub-number">{total(b).toLocaleString("th-TH")}</td><td><button onClick={() => setDetail(b)}>ตรวจ {b.items.length} รายการ</button></td></tr>)}</tbody></table></div>
        {!visible.length && <p className="hub-empty">{store?.source ? "ไม่พบสาขาตามคำค้น" : "ยังไม่มีข้อมูลสาขา"}</p>}
      </section>
    </div><aside className="hub-side"><section className="hub-card hub-export"><h3>3. ออกใบส่งของ</h3><label>วันที่ส่ง<input type="date" min="2000-01-01" max="2200-12-31" value={date} onChange={e => { setDate(e.target.value); setFile(""); }}/></label><div className="hub-summary"><strong>{selected.length}</strong><span>สาขา / ชีท</span><strong>{chosen.reduce((sum,b) => sum+total(b),0).toLocaleString("th-TH")}</strong><span>PAC รวม</span></div>
      <p>หนึ่งไฟล์ต่อวัน · หนึ่งชีทต่อสาขา</p><p className="hub-hint">ชื่อชีท {date ? Number(date.slice(-2)) : "วันที่"}_รหัสสาขา<br/>สีแท็บแยกตามรูท · หน้าพิมพ์ A4</p>
      {chosen.some(b => !b.ready) && <p className="hub-warning">มีสาขาที่ไม่ได้ระบุพร้อมส่งในไฟล์ กรุณาตรวจรายการที่เลือก</p>}
      <button className="hub-primary" disabled={!store?.source || !selected.length || !date} onClick={() => void act(async () => { const result = await service.export(date, selected); apply(result.store); setFile(result.path); setMessage(`สร้างใบส่งของ ${thaiDate(date)} จำนวน ${result.store.history[0].count} สาขาแล้ว`); })}>{busy ? "กำลังดำเนินการ…" : "ออกใบส่งของ Excel"}</button>
      {file && <button className="hub-open" onClick={() => void act(async () => { await service.openFile(file); setMessage("เปิดไฟล์ใน Excel แล้ว กด Ctrl + P เพื่อพิมพ์"); })}>เปิด Excel / พิมพ์</button>}
      <p className="hub-hint">ไฟล์อยู่บน Desktop ในโฟลเดอร์ ValuePlus Delivery Notes และเปิดซ้ำจากประวัติได้</p>
    </section><details className="hub-card hub-settings"><summary>ตั้งค่าเอกสาร (ครั้งเดียว)</summary>{settings && <><p className="hub-hint">กดบันทึกเมื่อแก้ไข เพื่อใช้ในการออกไฟล์ครั้งต่อไป</p>{([{ key:"company", label:"บริษัท" },{ key:"address", label:"ที่อยู่บริษัท" },{ key:"vendor", label:"Vendor" },{ key:"preparedBy", label:"ชื่อผู้จัดทำ (เว้นว่างได้)" }] as const).map(f => <label key={f.key}>{f.label}<input maxLength={f.key === "address" ? 250 : f.key === "company" ? 150 : f.key === "vendor" ? 100 : 80} value={settings[f.key]} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}/></label>)}<button onClick={() => void act(async () => { apply(await service.saveSettings(settings)); setMessage("บันทึกข้อมูลเอกสารแล้ว"); })}>บันทึกตั้งค่า</button><hr/><p><strong>เทมเพลต:</strong> {store?.templateName}</p><p className="hub-hint">มีเทมเพลตพร้อมใช้ หากแนบใหม่ต้องใช้ผัง HUB เดิม</p><button onClick={() => void act(async () => { const path=await service.selectFile(); if(path){ apply(await service.importTemplate(path));setMessage("บันทึกเทมเพลตแล้ว");} })}>เปลี่ยนเทมเพลต</button><button onClick={() => void act(async () => { apply(await service.resetTemplate()); setMessage("ใช้เทมเพลต HUB ของ ValuePlus แล้ว"); })}>ใช้เทมเพลตมาตรฐาน</button><p className="hub-hint">ขนาดบรรจุ 1 PAC : 1 PAC<br/>สั่งและส่งใช้ยอดเดียวกันจากไฟล์<br/>คงหัว “ราคาขายปลีก” ตามแบบ ไม่มีตัวเลขราคา<br/>เลขสาขาและชื่ออยู่บรรทัดเดียวกัน</p></>}</details></aside></div>
    <section className="hub-card"><div className="hub-section-title"><h3>ประวัติใบส่งของ</h3><span>{store?.history.length || 0} ไฟล์</span></div><p className="hub-hint">เปิดไฟล์เดิมตามข้อมูลวันที่ออก ข้อมูลและประวัติเก็บในเครื่องนี้</p>{store?.history.map(h => <div className="hub-history" key={h.id}><div><strong>{h.filename}</strong><p>{thaiDate(h.date)} · {h.count} สาขา · {h.sourceName}</p></div><button onClick={() => void act(async () => service.openHistory(h.id))}>เปิด / พิมพ์ซ้ำ</button></div>)}{!store?.history.length && <p className="hub-empty">ยังไม่มีไฟล์ที่ออก</p>}</section>
    </fieldset>
    {busy && <p role="status" className="hub-progress">กำลังดำเนินการ กรุณารอสักครู่…</p>}
    {detail && <div className="hub-modal" role="dialog" aria-modal="true" aria-label="ตรวจรายการสินค้า"><section className="hub-card"><div className="hub-section-title"><h3>{detail.code} {detail.name}</h3><button onClick={() => setDetail(null)}>ปิด</button></div><p>ยอดประจำวัน · ขนาดบรรจุ 1 PAC : 1 PAC</p><div className="hub-table"><table><thead><tr><th>รหัสสินค้า</th><th>รายการ</th><th>สั่ง PAC</th><th>ส่ง PAC</th></tr></thead><tbody>{detail.items.map(i => <tr key={i.code}><td>{i.code}</td><td>{i.name}</td><td>{i.quantity}</td><td>{i.quantity}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>รวม</th><th>{total(detail)}</th><th>{total(detail)}</th></tr></tfoot></table></div></section></div>}
  </section>;
}
