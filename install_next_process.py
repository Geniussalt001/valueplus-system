from pathlib import Path
import sys


project_root = (
    Path(sys.argv[1]).resolve()
    if len(sys.argv) > 1
    else Path(__file__).resolve().parent
)

page_path = (
    project_root
    / "src"
    / "pages"
    / "modules"
    / "SplitRenamePoPage.tsx"
)

if not page_path.is_file():
    raise SystemExit(
        f"ไม่พบไฟล์ SplitRenamePoPage.tsx: {page_path}",
    )

content = page_path.read_text(encoding="utf-8")
content = content.replace("\r\n", "\n")

if (
    "onNextProcess: (pdfPath: string) => void;" in content
    and "<span>Next Process</span>" in content
):
    print("Next Process ถูกติดตั้งอยู่แล้ว")
    raise SystemExit(0)

old_props = """interface SplitRenamePoPageProps {
  onBack: () => void;
}

export function SplitRenamePoPage({
  onBack,
}: SplitRenamePoPageProps) {
"""

new_props = """interface SplitRenamePoPageProps {
  onBack: () => void;
  onNextProcess: (pdfPath: string) => void;
}

export function SplitRenamePoPage({
  onBack,
  onNextProcess,
}: SplitRenamePoPageProps) {
"""

if old_props not in content:
    raise SystemExit(
        "ไม่พบตำแหน่ง Props สำหรับเพิ่ม Next Process",
    )

content = content.replace(
    old_props,
    new_props,
    1,
)

preview_anchor = "      {processor.preview && (\n"

next_process_block = """      {processor.savedOutputPath && processor.pdfPath && (
        <div
          className="
            mt-5
            flex
            justify-end
          "
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onNextProcess(
                processor.pdfPath,
              );
            }}
            className="
              flex
              items-center
              justify-center
              gap-3
              rounded-xl
              border
              border-sky-300/35
              bg-gradient-to-r
              from-sky-400/20
              to-cyan-300/10
              px-7
              py-3.5
              text-sm
              font-semibold
              text-sky-100
              shadow-lg
              shadow-sky-500/10
              transition
              hover:-translate-y-0.5
              hover:border-sky-300/55
              hover:from-sky-400/30
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            <span>Next Process</span>
            <span className="text-sky-300">ลงยอด SO รายวัน</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {processor.preview && (
"""

if preview_anchor not in content:
    raise SystemExit(
        "ไม่พบตำแหน่งสำหรับเพิ่มปุ่ม Next Process",
    )

content = content.replace(
    preview_anchor,
    next_process_block,
    1,
)

page_path.write_text(
    content,
    encoding="utf-8",
    newline="\n",
)

print("ติดตั้ง Next Process เรียบร้อยแล้ว")
