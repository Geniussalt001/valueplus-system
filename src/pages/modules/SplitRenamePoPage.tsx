import { Files } from "lucide-react";
import { ModulePlaceholder } from "../../components/ModulePlaceholder";

export function SplitRenamePoPage({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <ModulePlaceholder
      title="แยก และเปลี่ยนชื่อ PO"
      subtitle="SPLIT & RENAME PO"
      description="ระบบแยกเอกสาร PDF ออกเป็นราย PO และเปลี่ยนชื่อไฟล์ตามข้อมูลในเอกสารโดยอัตโนมัติ"
      icon={Files}
      color="#60a5fa"
      onBack={onBack}
    />
  );
}