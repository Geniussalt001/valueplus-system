import { FileSpreadsheet } from "lucide-react";
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function DailySoPage({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <ModulePlaceholder
      title="ลงยอด SO รายวัน"
      subtitle="DAILY SO IMPORT"
      description="ระบบอ่านข้อมูลจากเอกสารและจัดเตรียมข้อมูลสำหรับนำเข้าสู่รายงาน SO ประจำวัน"
      icon={FileSpreadsheet}
      color="#38bdf8"
      onBack={onBack}
    />
  );
}