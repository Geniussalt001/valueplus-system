import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function DailyPickingPage({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <ModulePlaceholder
      title="ออกใบจัดรายวัน"
      subtitle="DAILY PICKING"
      description="ระบบสร้างและตรวจสอบรายงานใบจัดสินค้าประจำวันจากเอกสาร PDF และข้อมูลใบสั่งซื้อ"
      icon={ClipboardList}
      color="#22d3ee"
      onBack={onBack}
    />
  );
}