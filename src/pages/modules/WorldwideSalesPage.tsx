import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, Boxes, Building2, CalendarDays, CheckCircle2, ClipboardList, LoaderCircle, MapPin, Plus, Save, Search, Store, X } from "lucide-react";

import { worldwideSalesService } from "../../services/worldwideSalesService";
import type { WorldwideProduct, WorldwideStore } from "../../types/worldwideSales.types";

interface WorldwideSalesPageProps { onBack: () => void; }
type ManagementSection = "entry" | "stores" | "products";

export function WorldwideSalesPage({ onBack }: WorldwideSalesPageProps) {
  const [section, setSection] = useState<ManagementSection>("entry");
  const [stores, setStores] = useState<WorldwideStore[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [province, setProvince] = useState("");
  const [products, setProducts] = useState<WorldwideProduct[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productName, setProductName] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [piecesPerCarton, setPiecesPerCarton] = useState("");
  const [part, setPart] = useState<"retail" | "worldwide">("retail");
  const [salesDate, setSalesDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [cartonsByProduct, setCartonsByProduct] = useState<Record<string, string>>({});
  const [salesCount, setSalesCount] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingSale, setIsSavingSale] = useState(false);

  useEffect(() => {
    let active = true;
    worldwideSalesService.bootstrap()
      .then((data) => {
        if (!active) return;
        setStores(data.stores);
        setProducts(data.products);
        setSalesCount(data.salesCount);
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredStores = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("th");
    if (!keyword) return stores;
    return stores.filter((store) =>
      `${store.name} ${store.province}`.toLocaleLowerCase("th").includes(keyword),
    );
  }, [searchTerm, stores]);

  const filteredProducts = useMemo(() => {
    const keyword = productSearchTerm.trim().toLocaleLowerCase("th");
    if (!keyword) return products;
    return products.filter((product) =>
      `${product.name} ${product.weightGrams} ${product.piecesPerCarton}`
        .toLocaleLowerCase("th")
        .includes(keyword),
    );
  }, [productSearchTerm, products]);

  const resetStoreForm = () => {
    setStoreName("");
    setProvince("");
    setIsAddingStore(false);
  };

  const addStore = async () => {
    const name = storeName.trim();
    const storeProvince = province.trim();
    if (!name || !storeProvince) return;
    setIsSavingStore(true);
    setErrorMessage("");
    try {
      const store = await worldwideSalesService.createStore(name, storeProvince);
      setStores((current) => [...current, store].sort((a, b) => a.name.localeCompare(b.name, "th")));
      resetStoreForm();
      setSaveMessage("เพิ่มร้านค้าในฐานข้อมูลเรียบร้อยแล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingStore(false);
    }
  };

  const resetProductForm = () => {
    setProductName("");
    setWeightGrams("");
    setPiecesPerCarton("");
    setIsAddingProduct(false);
  };

  const addProduct = async () => {
    const name = productName.trim();
    const grams = Number(weightGrams);
    const pieces = Number(piecesPerCarton);
    if (!name || !Number.isFinite(grams) || grams <= 0 || !Number.isInteger(pieces) || pieces <= 0) return;
    setIsSavingProduct(true);
    setErrorMessage("");
    try {
      const product = await worldwideSalesService.createProduct(name, grams, pieces);
      setProducts((current) => [...current, product].sort((a, b) => a.name.localeCompare(b.name, "th")));
      resetProductForm();
      setSaveMessage("เพิ่มสินค้าในฐานข้อมูลเรียบร้อยแล้ว");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingProduct(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSaveMessage("");
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const canSaveSales = Boolean(
    salesDate &&
    selectedStoreId &&
    selectedProductIds.length &&
    selectedProductIds.every((id) => Number.isInteger(Number(cartonsByProduct[id])) && Number(cartonsByProduct[id]) > 0),
  );

  const saveSales = async () => {
    if (!canSaveSales) return;
    setIsSavingSale(true);
    setErrorMessage("");
    setSaveMessage("");
    try {
      const result = await worldwideSalesService.createSale({
        part,
        date: salesDate,
        storeId: selectedStoreId,
        items: selectedProductIds.map((productId) => ({ productId, cartons: Number(cartonsByProduct[productId]) })),
      });
      setSelectedProductIds([]);
      setCartonsByProduct({});
      setSalesCount((current) => current + 1);
      setSaveMessage(`บันทึก ${result.itemCount} รายการ รวม ${result.totalCartons.toLocaleString("th-TH")} ลังเรียบร้อยแล้ว`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingSale(false);
    }
  };

  return (
    <div className="vp-work-page mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <header className="vp-page-header flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-violet-700">
            <ArrowLeft size={17} /> กลับหน้าลงยอดรายวัน
          </button>
          <p className="text-[10px] font-semibold tracking-[0.24em] text-violet-700">WORLDWIDE SALES</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">ลงยอดขาย เวิร์ลไวด์</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">จัดการข้อมูลร้านค้าและสินค้า ก่อนเริ่มกระบวนการลงยอดขาย</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ManagementButton active={section === "stores"} icon={<Store size={18} />} label="จัดการร้านค้า" onClick={() => setSection("stores")} />
          <ManagementButton active={section === "products"} icon={<Boxes size={18} />} label="จัดการสินค้า" onClick={() => setSection("products")} />
        </div>
      </header>

      {errorMessage ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"><AlertCircle size={19} className="mt-0.5 shrink-0" /><span className="flex-1">{errorMessage}</span><button type="button" onClick={() => setErrorMessage("")} className="font-semibold">ปิด</button></div> : null}
      {isLoading ? <div className="mt-8 flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm font-semibold text-slate-500"><LoaderCircle size={22} className="mr-3 animate-spin text-violet-600" /> กำลังโหลดฐานข้อมูล...</div> : null}

      {!isLoading && section === "entry" ? (
        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4 border-b border-slate-100 p-6 lg:px-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><ClipboardList size={23} /></span>
            <div><p className="text-[10px] font-semibold tracking-[0.2em] text-violet-600">SALES ENTRY</p><h3 className="mt-1 text-xl font-semibold text-slate-900">บันทึกยอดขาย</h3><p className="mt-1 text-xs text-slate-500">ฐานข้อมูลมีรายการขายแล้ว {salesCount.toLocaleString("th-TH")} รายการ</p></div>
          </div>

          <div className="p-6 lg:p-8">
            <div>
              <p className="text-xs font-semibold text-slate-600">เลือก PART ที่ทำงาน</p>
              <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
                <PartButton active={part === "retail"} title="Retail" description="บริษัทรีเทล" onClick={() => { setPart("retail"); setSaveMessage(""); }} />
                <PartButton active={part === "worldwide"} title="Worldwide" description="บริษัทเวิร์ลไวด์" onClick={() => { setPart("worldwide"); setSaveMessage(""); }} />
              </div>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><CalendarDays size={15} /> วันที่</span><input type="date" value={salesDate} onChange={(event) => { setSalesDate(event.target.value); setSaveMessage(""); }} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>
              <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><Store size={15} /> ชื่อร้านค้า</span><select value={selectedStoreId} onChange={(event) => { setSelectedStoreId(event.target.value); setSaveMessage(""); }} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"><option value="">เลือกร้านค้า</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} — {store.province}</option>)}</select>{!stores.length ? <button type="button" onClick={() => setSection("stores")} className="mt-2 text-xs font-semibold text-violet-700 hover:text-violet-900">+ เพิ่มร้านค้าก่อนเริ่มลงยอด</button> : null}</label>
            </div>

            <div className="mt-7">
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold text-slate-600">รายการสินค้า</p><p className="mt-1 text-xs text-slate-400">เลือกได้หลายรายการ และกรอกจำนวนลังแยกแต่ละสินค้า</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">เลือกแล้ว {selectedProductIds.length} รายการ</span></div>
              {products.length ? <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-[52px_1fr_150px_180px] bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500"><span>เลือก</span><span>สินค้า</span><span>บรรจุ</span><span>จำนวน (ลัง)</span></div>{products.map((product) => { const selected = selectedProductIds.includes(product.id); return <div key={product.id} className={`grid grid-cols-[52px_1fr_150px_180px] items-center border-t border-slate-100 px-5 py-3 text-sm ${selected ? "bg-violet-50/50" : "bg-white"}`}><input type="checkbox" checked={selected} onChange={() => toggleProduct(product.id)} className="h-5 w-5 rounded border-slate-300 accent-violet-700" /><div><p className="font-semibold text-slate-800">{product.name}</p><p className="text-xs text-slate-400">{product.weightGrams.toLocaleString("th-TH")} กรัม</p></div><span className="text-slate-600">{product.piecesPerCarton} ชิ้น / ลัง</span><input type="number" min="1" step="1" disabled={!selected} value={cartonsByProduct[product.id] || ""} onChange={(event) => { setCartonsByProduct((current) => ({ ...current, [product.id]: event.target.value })); setSaveMessage(""); }} placeholder="จำนวนลัง" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400" /></div>; })}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"><Boxes size={25} className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีข้อมูลสินค้า</p><button type="button" onClick={() => setSection("products")} className="mt-2 text-xs font-semibold text-violet-700 hover:text-violet-900">+ เพิ่มสินค้าก่อนเริ่มลงยอด</button></div>}
            </div>

            <div className="mt-7 flex flex-col justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
              <div>{saveMessage ? <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} />{saveMessage}</p> : <p className="text-xs text-slate-400">กรอกข้อมูลและจำนวนลังให้ครบก่อนบันทึก</p>}</div>
              <button type="button" disabled={!canSaveSales || isSavingSale} onClick={saveSales} className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{isSavingSale ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />} {isSavingSale ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>
            </div>
          </div>
        </section>
      ) : !isLoading && section === "stores" ? (
        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:px-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Building2 size={23} /></span>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-violet-600">STORE DIRECTORY</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">รายการร้านค้า</h3>
                <p className="mt-1 text-xs text-slate-500">{stores.length} ร้านค้าในรายการ</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setSection("entry")} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700">กลับหน้าลงยอดขาย</button><button type="button" onClick={() => setIsAddingStore(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800"><Plus size={18} /> เพิ่มร้านค้าใหม่</button></div>
          </div>

          {isAddingStore ? (
            <div className="border-b border-violet-100 bg-violet-50/60 p-6 lg:px-8">
              <div className="flex items-center justify-between gap-4">
                <div><h4 className="font-semibold text-slate-900">เพิ่มร้านค้าใหม่</h4><p className="mt-1 text-xs text-slate-500">กรอกชื่อร้านค้าและจังหวัดให้ครบถ้วน</p></div>
                <button type="button" onClick={resetStoreForm} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900" aria-label="ปิดแบบฟอร์มเพิ่มร้านค้า"><X size={17} /></button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <StoreField label="ชื่อร้านค้า" placeholder="เช่น ร้านตัวอย่าง เชียงใหม่" value={storeName} onChange={setStoreName} />
                <StoreField label="จังหวัด" placeholder="เช่น เชียงใหม่" value={province} onChange={setProvince} />
                <button type="button" disabled={!storeName.trim() || !province.trim() || isSavingStore} onClick={addStore} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{isSavingStore ? <LoaderCircle size={17} className="animate-spin" /> : null}{isSavingStore ? "กำลังบันทึก..." : "บันทึกร้านค้า"}</button>
              </div>
            </div>
          ) : null}

          <div className="p-6 lg:px-8">
            <label className="relative block max-w-2xl">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาจากชื่อร้านค้าหรือจังหวัด..." className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>

            {filteredStores.length ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[72px_1fr_1fr] bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500"><span>ลำดับ</span><span>ชื่อร้านค้า</span><span>จังหวัด</span></div>
                {filteredStores.map((store, index) => (
                  <div key={store.id} className="grid grid-cols-[72px_1fr_1fr] items-center border-t border-slate-100 px-5 py-4 text-sm">
                    <span className="text-slate-400">{index + 1}</span>
                    <span className="font-semibold text-slate-800">{store.name}</span>
                    <span className="inline-flex items-center gap-2 text-slate-600"><MapPin size={15} className="text-violet-500" />{store.province}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Store size={25} /></span>
                <h4 className="mt-5 font-semibold text-slate-800">{stores.length ? "ไม่พบร้านค้าที่ค้นหา" : "ยังไม่มีข้อมูลร้านค้า"}</h4>
                <p className="mt-2 text-sm text-slate-500">{stores.length ? "ลองค้นหาด้วยชื่อร้านหรือจังหวัดอื่น" : "กดเพิ่มร้านค้าใหม่ เพื่อสร้างรายการแรก"}</p>
              </div>
            )}
          </div>
        </section>
      ) : !isLoading ? (
        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:px-8">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><Boxes size={23} /></span>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700">PRODUCT DIRECTORY</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">รายการสินค้า</h3>
                <p className="mt-1 text-xs text-slate-500">{products.length} สินค้าในรายการ</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setSection("entry")} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700">กลับหน้าลงยอดขาย</button><button type="button" onClick={() => setIsAddingProduct(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-800"><Plus size={18} /> เพิ่มสินค้าใหม่</button></div>
          </div>

          {isAddingProduct ? (
            <div className="border-b border-cyan-100 bg-cyan-50/60 p-6 lg:px-8">
              <div className="flex items-center justify-between gap-4">
                <div><h4 className="font-semibold text-slate-900">เพิ่มสินค้าใหม่</h4><p className="mt-1 text-xs text-slate-500">กรอกชื่อสินค้า น้ำหนัก และจำนวนชิ้นต่อลัง</p></div>
                <button type="button" onClick={resetProductForm} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900" aria-label="ปิดแบบฟอร์มเพิ่มสินค้า"><X size={17} /></button>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_.7fr_.7fr_auto] xl:items-end">
                <ProductField label="ชื่อสินค้า" placeholder="เช่น เค้กช็อกโกแลต" value={productName} onChange={setProductName} />
                <ProductField label="น้ำหนัก (กรัม)" placeholder="เช่น 55" value={weightGrams} onChange={setWeightGrams} numeric />
                <ProductField label="จำนวนชิ้น / ลัง" placeholder="เช่น 24" value={piecesPerCarton} onChange={setPiecesPerCarton} numeric integer />
                <button type="button" disabled={!productName.trim() || Number(weightGrams) <= 0 || !Number.isInteger(Number(piecesPerCarton)) || Number(piecesPerCarton) <= 0 || isSavingProduct} onClick={addProduct} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{isSavingProduct ? <LoaderCircle size={17} className="animate-spin" /> : null}{isSavingProduct ? "กำลังบันทึก..." : "บันทึกสินค้า"}</button>
              </div>
            </div>
          ) : null}

          <div className="p-6 lg:px-8">
            <label className="relative block max-w-2xl">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={productSearchTerm} onChange={(event) => setProductSearchTerm(event.target.value)} placeholder="ค้นหาจากชื่อสินค้า น้ำหนัก หรือจำนวนต่อลัง..." className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100" />
            </label>

            {filteredProducts.length ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[72px_1fr_180px_180px] bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500"><span>ลำดับ</span><span>ชื่อสินค้า</span><span>น้ำหนัก</span><span>บรรจุ / ลัง</span></div>
                {filteredProducts.map((product, index) => (
                  <div key={product.id} className="grid grid-cols-[72px_1fr_180px_180px] items-center border-t border-slate-100 px-5 py-4 text-sm">
                    <span className="text-slate-400">{index + 1}</span>
                    <span className="font-semibold text-slate-800">{product.name}</span>
                    <span className="text-slate-600">{product.weightGrams.toLocaleString("th-TH")} กรัม</span>
                    <span className="text-slate-600">{product.piecesPerCarton.toLocaleString("th-TH")} ชิ้น / ลัง</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Boxes size={25} /></span>
                <h4 className="mt-5 font-semibold text-slate-800">{products.length ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีข้อมูลสินค้า"}</h4>
                <p className="mt-2 text-sm text-slate-500">{products.length ? "ลองค้นหาด้วยชื่อหรือตัวเลขอื่น" : "กดเพิ่มสินค้าใหม่ เพื่อสร้างรายการแรก"}</p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ManagementButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void; }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-w-44 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm transition ${active ? "border-violet-700 bg-violet-700 text-white shadow-violet-200" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"}`}>{icon}{label}</button>;
}

function PartButton({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void; }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-200" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"}`}><span className="block text-base font-semibold">{title}</span><span className={`mt-1 block text-xs ${active ? "text-violet-100" : "text-slate-400"}`}>{description}</span></button>;
}

function StoreField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span><input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>;
}

function ProductField({ label, placeholder, value, onChange, numeric = false, integer = false }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; numeric?: boolean; integer?: boolean; }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span><input type={numeric ? "number" : "text"} min={numeric ? 1 : undefined} step={integer ? 1 : numeric ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></label>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง";
}
