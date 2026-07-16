import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function DailySummaryPage({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <ModulePlaceholder
      title="สรุปยอดรายวัน"
      subtitle="DAILY SUMMARY"
      description="ระบบรวบรวม ตรวจสอบ และแสดงผลสรุปยอดการดำเนินงานประจำวันขององค์กร"
      icon={BarChart3}
      color="#a78bfa"
      onBack={onBack}
    />
  );
}