import type { DoAnalyticsRegion } from "../../types/doDelivery.types";

const REGIONS = [
  { key: "เหนือ", label: "ภาคเหนือ", path: "M116 22 L190 18 L232 72 L218 142 L180 188 L118 168 L84 112 Z", x: 153, y: 98 },
  { key: "อีสาน", label: "ภาคอีสาน", path: "M232 76 L318 108 L332 194 L284 246 L214 220 L180 188 L218 142 Z", x: 267, y: 164 },
  { key: "กลาง", label: "ภาคกลาง", path: "M118 168 L180 188 L214 220 L202 294 L154 326 L116 278 L96 216 Z", x: 157, y: 245 },
  { key: "ตะวันตก", label: "ภาคตะวันตก", path: "M84 154 L118 168 L96 216 L116 278 L94 350 L58 310 L66 224 Z", x: 88, y: 256 },
  { key: "ตะวันออก", label: "ภาคตะวันออก", path: "M214 220 L284 246 L270 314 L202 294 Z", x: 241, y: 270 },
  { key: "ใต้", label: "ภาคใต้", path: "M154 326 L202 294 L190 370 L212 436 L190 590 L150 548 L158 454 L128 388 Z", x: 171, y: 442 },
];

interface Props { regions: DoAnalyticsRegion[]; selectedRegion: string; onSelectRegion: (region: string) => void; }

export function ThailandDeliveryMap({ regions, selectedRegion, onSelectRegion }: Props) {
  const quantities = Object.fromEntries(regions.map((item) => [item.region, item.quantity]));
  const max = Math.max(...regions.map((item) => item.quantity), 1);
  return <div className="relative mx-auto max-w-[430px]">
    <svg viewBox="35 0 315 620" role="img" aria-label="แผนที่ประเทศไทยแบ่งตามภูมิภาค" className="h-auto w-full drop-shadow-[0_18px_30px_rgba(15,118,110,0.16)]">
      {REGIONS.map((region) => {
        const quantity = quantities[region.key] || 0;
        const opacity = quantity ? 0.24 + quantity / max * 0.68 : 0.1;
        return <g key={region.key}>
          <path d={region.path} onClick={() => onSelectRegion(region.key)} className="cursor-pointer stroke-white stroke-[4] transition-all hover:brightness-95" style={{ fill: selectedRegion === region.key ? "#0f766e" : `rgba(20, 184, 166, ${opacity})` }}><title>{region.label}: {new Intl.NumberFormat("th-TH").format(quantity)} ชิ้น</title></path>
          <text x={region.x} y={region.y} textAnchor="middle" className="pointer-events-none fill-slate-800 text-[13px] font-semibold">{region.key}</text>
        </g>;
      })}
    </svg>
    <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-500"><span>ยอดต่ำ</span><span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-teal-100 to-teal-700" /><span>ยอดสูง</span></div>
  </div>;
}
