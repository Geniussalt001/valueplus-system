import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  ArrowLeft,
  Check,
  CircleOff,
  Database,
  LoaderCircle,
  PackagePlus,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  productCatalogService,
} from "../../../services/productCatalogService";

import type {
  ProductCatalogItem,
} from "../../../types/productCatalog.types";

interface ProductCatalogPageProps {
  onBack: () => void;
  backLabel?: string;
}

interface ProductFormState {
  productCode: string;
  displayName: string;
  lineName: string;
  displayOrder: string;
  active: boolean;
}

const emptyForm: ProductFormState = {
  productCode: "",
  displayName: "",
  lineName: "",
  displayOrder: "",
  active: true,
};

export function ProductCatalogPage({
  onBack,
  backLabel = "กลับหน้าแดชบอร์ด",
}: ProductCatalogPageProps) {
  const [products, setProducts] =
    useState<ProductCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] =
    useState<string | null>(null);
  const [form, setForm] =
    useState<ProductFormState>(emptyForm);

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      setProducts(
        await productCatalogService.list(),
      );
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th-TH");

    return products.filter((product) => {
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active" && product.active) ||
        (statusFilter === "inactive" && !product.active);

      if (!statusMatches) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        product.product_code,
        product.source_name,
        product.display_name,
        product.line_name,
      ].some((value) =>
        value.toLocaleLowerCase("th-TH").includes(normalized),
      );
    });
  }, [products, query, statusFilter]);

  const activeCount = products.filter(
    (product) => product.active,
  ).length;

  const openCreate = () => {
    setEditingCode(null);
    setForm({
      ...emptyForm,
      displayOrder: String(products.length + 1),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEdit = (product: ProductCatalogItem) => {
    setEditingCode(product.product_code);
    setForm({
      productCode: product.product_code,
      displayName: product.display_name,
      lineName: product.line_name,
      displayOrder: String(product.display_order),
      active: product.active,
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const saveProduct = async () => {
    if (saving) {
      return;
    }

    const productCode = form.productCode.trim();
    const displayName = form.displayName.trim();

    if (!productCode || !displayName) {
      setError("กรุณากรอกรหัสสินค้าและชื่อสินค้า");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const displayOrder = form.displayOrder
        ? Number(form.displayOrder)
        : undefined;

      if (editingCode) {
        await productCatalogService.update({
          productCode: editingCode,
          displayName,
          lineName: form.lineName.trim(),
          displayOrder: displayOrder ?? 0,
        });
        setSuccess(`แก้ไขสินค้า ${editingCode} เรียบร้อยแล้ว`);
      } else {
        await productCatalogService.create({
          productCode,
          displayName,
          lineName: form.lineName.trim(),
          displayOrder,
          active: form.active,
        });
        setSuccess(`เพิ่มสินค้า ${productCode} เรียบร้อยแล้ว`);
      }

      setModalOpen(false);
      await loadProducts();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: ProductCatalogItem) => {
    setError("");
    setSuccess("");

    try {
      await productCatalogService.setActive(
        product.product_code,
        !product.active,
      );
      setSuccess(
        `${product.active ? "ปิด" : "เปิด"}ใช้งาน ${product.product_code} เรียบร้อยแล้ว`,
      );
      await loadProducts();
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  };

  const deleteProduct = async (product: ProductCatalogItem) => {
    const confirmed = window.confirm(
      `ลบสินค้า ${product.product_code} — ${product.display_name} ถาวรหรือไม่?\n\nหากต้องการเก็บประวัติ แนะนำให้กด “ปิดใช้งาน” แทน`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await productCatalogService.delete(product.product_code);
      setSuccess(`ลบสินค้า ${product.product_code} เรียบร้อยแล้ว`);
      await loadProducts();
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 transition hover:text-emerald-300"
          >
            <ArrowLeft size={17} />
            {backLabel}
          </button>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-emerald-300">
            PRODUCT CATALOG
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            จัดการข้อมูลสินค้า
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            เพิ่ม แก้ไข เปิดหรือปิดสินค้า และกำหนดชื่อสำหรับสรุปยอดกับข้อความ LINE
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-6 py-3 text-sm font-medium text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-300/15"
        >
          <PackagePlus size={18} />
          เพิ่มสินค้า
        </button>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="สินค้าทั้งหมด" value={products.length} icon={<Database size={19} />} />
        <SummaryCard label="เปิดใช้งาน" value={activeCount} icon={<Check size={19} />} tone="emerald" />
        <SummaryCard label="ปิดใช้งาน" value={products.length - activeCount} icon={<CircleOff size={19} />} tone="amber" />
      </section>

      {(error || success) && (
        <div className={`mt-5 rounded-xl border px-5 py-4 text-sm ${error ? "border-red-300/20 bg-red-300/[0.07] text-red-200" : "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"}`}>
          {error || success}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-cyan-300/15 bg-[#071827]">
        <div className="flex flex-col gap-3 border-b border-slate-700/70 p-4 lg:flex-row lg:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-[#03111e] px-4 py-3 text-slate-300 focus-within:border-cyan-300/40">
            <Search size={18} className="shrink-0 text-cyan-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหารหัสสินค้า ชื่อสินค้า หรือชื่อ LINE"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-xl border border-slate-700 bg-[#03111e] px-4 py-3 text-sm text-slate-200 outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>

          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-5 py-3 text-sm text-cyan-200 disabled:opacity-40"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            โหลดใหม่
          </button>
        </div>

        <div className="max-h-[calc(100vh-460px)] min-h-[360px] overflow-auto">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center gap-3 text-slate-400">
              <LoaderCircle className="animate-spin" size={22} />
              กำลังโหลดข้อมูลสินค้า...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
              ไม่พบสินค้าตามเงื่อนไข
            </div>
          ) : (
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#0a1d2c] text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-4">ลำดับ</th>
                  <th className="px-5 py-4">รหัสสินค้า</th>
                  <th className="px-5 py-4">ชื่อจากต้นทาง</th>
                  <th className="px-5 py-4">ชื่อแสดงผล</th>
                  <th className="px-5 py-4">ชื่อสำหรับ LINE</th>
                  <th className="px-5 py-4">พบล่าสุด</th>
                  <th className="px-5 py-4">สถานะ</th>
                  <th className="px-5 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProducts.map((product) => (
                  <tr key={product.product_code} className={`transition hover:bg-white/[0.025] ${product.active ? "" : "opacity-55"}`}>
                    <td className="px-5 py-4 font-semibold text-slate-400">{product.display_order}</td>
                    <td className="px-5 py-4 font-semibold text-cyan-300">{product.product_code}</td>
                    <td className="max-w-[280px] px-5 py-4 text-slate-400">{product.source_name}</td>
                    <td className="max-w-[280px] px-5 py-4 font-medium text-white">{product.display_name}</td>
                    <td className="px-5 py-4 text-violet-200">{product.line_name || "—"}</td>
                    <td className="px-5 py-4 text-slate-400">{product.last_seen_date || "เพิ่มด้วยมือ"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs ${product.active ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}>
                        {product.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconButton label="แก้ไข" onClick={() => openEdit(product)}><Pencil size={16} /></IconButton>
                        <IconButton label={product.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} onClick={() => void toggleActive(product)} tone={product.active ? "amber" : "emerald"}><Power size={16} /></IconButton>
                        <IconButton label="ลบถาวร" onClick={() => void deleteProduct(product)} tone="red"><Trash2 size={16} /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-cyan-300/20 bg-[#071827] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/70 px-6 py-5">
              <div>
                <p className="text-lg font-semibold text-white">{editingCode ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</p>
                <p className="mt-1 text-xs text-slate-500">ข้อมูลจะถูกบันทึกลงฐานข้อมูลอัตโนมัติ</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={20} /></button>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Field label="รหัสสินค้า" value={form.productCode} disabled={Boolean(editingCode)} placeholder="01-0000-00" onChange={(value) => setForm((current) => ({ ...current, productCode: value }))} />
              <Field label="ลำดับแสดงผล" value={form.displayOrder} type="number" placeholder="1" onChange={(value) => setForm((current) => ({ ...current, displayOrder: value }))} />
              <div className="sm:col-span-2"><Field label="ชื่อแสดงผล" value={form.displayName} placeholder="ชื่อที่ใช้บนหน้าสรุปยอด" onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} /></div>
              <div className="sm:col-span-2"><Field label="ชื่อสำหรับส่ง LINE" value={form.lineName} placeholder="เว้นว่างเพื่อใช้ชื่อแสดงผล" onChange={(value) => setForm((current) => ({ ...current, lineName: value }))} /></div>

              {!editingCode && (
                <label className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-700 bg-[#03111e] px-4 py-3 text-sm text-slate-300">
                  เปิดใช้งานทันที
                  <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-5 w-5 accent-emerald-400" />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-700/70 px-6 py-5">
              <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300">ยกเลิก</button>
              <button type="button" onClick={() => void saveProduct()} disabled={saving} className="flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-6 py-3 text-sm font-medium text-emerald-200 disabled:opacity-40">
                {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />}
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone = "cyan" }: { label: string; value: number; icon: ReactNode; tone?: "cyan" | "emerald" | "amber" }) {
  const tones = { cyan: "text-cyan-300", emerald: "text-emerald-300", amber: "text-amber-300" };
  return <div className="rounded-2xl border border-slate-700/80 bg-[#071827] p-5"><div className={`flex items-center gap-2 ${tones[tone]}`}>{icon}<span className="text-xs font-medium">{label}</span></div><p className="mt-3 text-3xl font-semibold text-white">{value.toLocaleString("th-TH")}</p></div>;
}

function IconButton({ label, onClick, children, tone = "slate" }: { label: string; onClick: () => void; children: ReactNode; tone?: "slate" | "amber" | "emerald" | "red" }) {
  const tones = { slate: "text-slate-300 hover:border-cyan-300/30 hover:text-cyan-200", amber: "text-amber-300 hover:border-amber-300/30", emerald: "text-emerald-300 hover:border-emerald-300/30", red: "text-red-300 hover:border-red-300/30" };
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`rounded-lg border border-slate-700 p-2 transition hover:bg-white/5 ${tones[tone]}`}>{children}</button>;
}

function Field({ label, value, onChange, placeholder, disabled = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean; type?: "text" | "number" }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} min={type === "number" ? 0 : undefined} className="w-full rounded-xl border border-slate-700 bg-[#03111e] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50" /></label>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
