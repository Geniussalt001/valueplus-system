import { useState } from "react";
import { CheckCircle2, Info, Sparkles, X } from "lucide-react";

import packageJson from "../../../package.json";

interface AppVersionBadgeProps {
  className?: string;
}

export function AppVersionBadge({ className = "" }: AppVersionBadgeProps) {
  const [open, setOpen] = useState(false);
  const version = packageJson.version;

  return (
    <>
      <button
        type="button"
        className={`app-version-badge ${className}`}
        onClick={() => setOpen(true)}
        aria-label={`ดูรายละเอียดเวอร์ชัน ${version}`}
      >
        <Info size={13} />
        Version {version}
      </button>

      {open && (
        <div className="app-version-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="app-version-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-version-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="app-version-close" onClick={() => setOpen(false)} aria-label="ปิด">
              <X size={18} />
            </button>
            <span className="app-version-icon"><Sparkles size={24} /></span>
            <p className="app-version-eyebrow">WHAT'S NEW</p>
            <h2 id="app-version-title">ValuePlus System {version}</h2>
            <div className="app-version-list">
              <p><CheckCircle2 size={16} /> หน้า Login ทันสมัยและเคลื่อนไหวอย่างนุ่มนวล</p>
              <p><CheckCircle2 size={16} /> เปลี่ยนชื่อพื้นที่ทำงานเป็นคลังสินค้า Warehouse</p>
              <p><CheckCircle2 size={16} /> ซ่อนสินค้าที่ตั้งค่า Express ครบแล้วโดยอัตโนมัติ</p>
              <p><CheckCircle2 size={16} /> ปรับสีปุ่มและเมนูให้มองเห็นชัดเจนขึ้น</p>
            </div>
            <button type="button" className="app-version-confirm" onClick={() => setOpen(false)}>
              เข้าใจแล้ว
            </button>
          </section>
        </div>
      )}
    </>
  );
}
