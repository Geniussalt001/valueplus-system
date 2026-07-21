from pathlib import Path
import sys


root = (
    Path(sys.argv[1]).resolve()
    if len(sys.argv) > 1
    else Path(__file__).resolve().parent
)


def read(relative: str) -> tuple[Path, str]:
    path = root / relative
    if not path.is_file():
        raise SystemExit(f"ไม่พบไฟล์: {path}")
    return path, path.read_text(encoding="utf-8").replace("\r\n", "\n")


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8", newline="\n")


# 1) เพิ่ม route
path, content = read("src/types/app.ts")
if '"product-catalog"' not in content:
    anchor = '  | "po-data";'
    if anchor not in content:
        raise SystemExit("ไม่พบตำแหน่ง WorkRoute ใน src/types/app.ts")
    content = content.replace(
        anchor,
        '  | "po-data"\n  | "product-catalog";',
        1,
    )
    write(path, content)


# 2) เพิ่มหน้าใน App
path, content = read("src/App.tsx")
if 'from "./pages/modules/product-catalog/ProductCatalogPage"' not in content:
    anchor = 'import type {\n  AppRoute,'
    block = '''import {
  ProductCatalogPage,
} from "./pages/modules/product-catalog/ProductCatalogPage";

'''
    if anchor not in content:
        raise SystemExit("ไม่พบตำแหน่ง import ใน src/App.tsx")
    content = content.replace(anchor, block + anchor, 1)

if 'case "product-catalog":' not in content:
    anchor = '      case "po-data":\n'
    block = '''      case "product-catalog":
        return (
          <ProductCatalogPage
            onBack={
              backToDashboard
            }
          />
        );

'''
    if anchor not in content:
        raise SystemExit("ไม่พบตำแหน่ง case ใน src/App.tsx")
    content = content.replace(anchor, block + anchor, 1)

write(path, content)


# 3) เพิ่มเมนูบน Dashboard/Sidebar
path, content = read("src/data/systemModules.ts")
if "PackageSearch," not in content:
    if "  Files,\n" in content:
        content = content.replace(
            "  Files,\n",
            "  Files,\n  PackageSearch,\n",
            1,
        )
    else:
        raise SystemExit("ไม่พบตำแหน่ง lucide icon ใน systemModules.ts")

if 'route:\n        "product-catalog"' not in content:
    anchor = "\n  ];"
    block = '''

    {
      id: 6,

      route:
        "product-catalog",

      title:
        "จัดการข้อมูลสินค้า",

      subtitle:
        "PRODUCT CATALOG",

      description:
        "เพิ่ม แก้ไข เปิด ปิด และกำหนดชื่อสินค้าสำหรับสรุปยอด",

      icon:
        PackageSearch,

      color:
        "#2dd4bf",

      status:
        "online",
    },
'''
    if anchor not in content:
        raise SystemExit("ไม่พบจุดสิ้นสุด systemModules")
    content = content.replace(anchor, block + anchor, 1)

write(path, content)


# 4) ลงทะเบียน Rust module
path, content = read("src-tauri/src/commands/mod.rs")
if "pub mod product_catalog;" not in content:
    content += "\npub mod product_catalog;\n"
    write(path, content)


# 5) ลงทะเบียน Tauri command
path, content = read("src-tauri/src/lib.rs")
if "use commands::product_catalog::" not in content:
    anchor = "#[tauri::command]\nfn greet("
    block = '''use commands::product_catalog::{
    manage_product_catalog,
};

'''
    if anchor not in content:
        raise SystemExit("ไม่พบตำแหน่ง import command ใน src-tauri/src/lib.rs")
    content = content.replace(anchor, block + anchor, 1)

if "                manage_product_catalog," not in content:
    anchor = "                greet,\n"
    if anchor not in content:
        raise SystemExit("ไม่พบ invoke_handler ใน src-tauri/src/lib.rs")
    content = content.replace(
        anchor,
        anchor + "                manage_product_catalog,\n",
        1,
    )

write(path, content)

print("ติดตั้งหน้าจัดการข้อมูลสินค้าเรียบร้อยแล้ว")
