export type ProductShowcaseCategory =
  | "Cake Roll"
  | "Monster Bread"
  | "Waffle"
  | "Cake & Cream";

export interface ProductShowcaseItem {
  id: string;
  name: string;
  thaiName: string;
  category: ProductShowcaseCategory;
  image: string;
  accent: string;
  softAccent: string;
  description: string;
  featured?: boolean;
}

const productImageRoot = "/images/product-showcase";

export const productShowcaseItems: ProductShowcaseItem[] = [
  {
    id: "milk-cake",
    name: "Milk Cake",
    thaiName: "มิลค์เค้ก",
    category: "Cake & Cream",
    image: `${productImageRoot}/milk-cake.webp`,
    accent: "#2369d8",
    softAccent: "#eaf4ff",
    description: "เค้กนมเนื้อนุ่มในแพ็กเกจสีฟ้า สดใส และจดจำง่าย",
    featured: true,
  },
  {
    id: "cake-roll-chocolate",
    name: "Cake Roll Chocolate",
    thaiName: "เค้กโรลช็อกโกแลต",
    category: "Cake Roll",
    image: `${productImageRoot}/cake-roll-chocolate.webp`,
    accent: "#754126",
    softAccent: "#fff2e8",
    description: "เค้กโรลลายช็อกโกแลต เหมาะสำหรับแนะนำในกลุ่มคนรักรสเข้ม",
    featured: true,
  },
  {
    id: "strawberry-monster-bread",
    name: "Strawberry Monster Bread",
    thaiName: "ขนมปังมอนสเตอร์รสสตรอว์เบอร์รี",
    category: "Monster Bread",
    image: `${productImageRoot}/strawberry-monster-bread.webp`,
    accent: "#e94b63",
    softAccent: "#fff0f3",
    description: "ขนมปังสีสันสดใสกับรสสตรอว์เบอร์รีที่โดดเด่นบนชั้นวาง",
    featured: true,
  },
  {
    id: "chiffon-cheese-cake",
    name: "Chiffon Cheese Cake",
    thaiName: "ชิฟฟ่อนชีสเค้ก",
    category: "Cake & Cream",
    image: `${productImageRoot}/chiffon-cheese-cake.webp`,
    accent: "#d99219",
    softAccent: "#fff8df",
    description: "ชิฟฟ่อนชีสเค้กโทนอบอุ่น เหมาะกับแคมเปญสายชีสและเบเกอรี่",
    featured: true,
  },
  {
    id: "cheese-egg-cake",
    name: "Cheese Egg Cake",
    thaiName: "เค้กไข่ชีส",
    category: "Cake & Cream",
    image: `${productImageRoot}/cheese-egg-cake.webp`,
    accent: "#e1a51e",
    softAccent: "#fff8df",
    description: "เค้กไข่รสชีสในแพ็กเกจสีเหลืองสะดุดตา",
  },
  {
    id: "cake-roll-matcha",
    name: "Cake Roll Matcha",
    thaiName: "เค้กโรลมัทฉะ",
    category: "Cake Roll",
    image: `${productImageRoot}/cake-roll-matcha.webp`,
    accent: "#4b8d5d",
    softAccent: "#edf8ee",
    description: "เค้กโรลลายมัทฉะในโทนสีเขียวธรรมชาติ",
  },
  {
    id: "cake-roll-pink-milk",
    name: "Cake Roll Pink Milk",
    thaiName: "เค้กโรลกลิ่นนมชมพู",
    category: "Cake Roll",
    image: `${productImageRoot}/cake-roll-pink-milk.webp`,
    accent: "#e97b9d",
    softAccent: "#fff0f5",
    description: "เค้กโรลกลิ่นนมชมพู โทนหวานสดใสและเป็นมิตร",
  },
  {
    id: "chizu-cake",
    name: "Chizu Cake",
    thaiName: "ชีสเค้ก",
    category: "Cake & Cream",
    image: `${productImageRoot}/chizu-cake.webp`,
    accent: "#dba71c",
    softAccent: "#fff9df",
    description: "ชีสเค้กขนาดพอดีคำในแพ็กเกจสีเหลืองครีม",
  },
  {
    id: "blueberry-monster-bread",
    name: "Blueberry Monster Bread",
    thaiName: "ขนมปังมอนสเตอร์รสบลูเบอร์รี",
    category: "Monster Bread",
    image: `${productImageRoot}/blueberry-monster-bread.webp`,
    accent: "#326cc8",
    softAccent: "#edf4ff",
    description: "ขนมปังมอนสเตอร์รสบลูเบอร์รีกับแพ็กเกจสีน้ำเงินสดใส",
  },
  {
    id: "yellow-peach-monster-bread",
    name: "Yellow Peach Monster Bread",
    thaiName: "ขนมปังมอนสเตอร์รสเยลโลว์พีช",
    category: "Monster Bread",
    image: `${productImageRoot}/yellow-peach-monster-bread.webp`,
    accent: "#e4a52d",
    softAccent: "#fff7e2",
    description: "ขนมปังมอนสเตอร์รสพีชในบรรยากาศสดใสแบบผลไม้",
  },
  {
    id: "raspberry-waffle",
    name: "Raspberry Waffle",
    thaiName: "วาฟเฟิลครีมราสเบอร์รี",
    category: "Waffle",
    image: `${productImageRoot}/raspberry-waffle.webp`,
    accent: "#dc467c",
    softAccent: "#fff0f6",
    description: "วาฟเฟิลครีมราสเบอร์รี หวานสดใสและเหมาะกับแคมเปญผลไม้",
  },
  {
    id: "coconut-milk-waffle",
    name: "Coconut Milk Waffle",
    thaiName: "วาฟเฟิลครีมโคโคนัทมิลค์",
    category: "Waffle",
    image: `${productImageRoot}/coconut-milk-waffle.webp`,
    accent: "#c98e16",
    softAccent: "#fff8e6",
    description: "วาฟเฟิลครีมโคโคนัทมิลค์ในโทนครีมทองดูอบอุ่น",
  },
  {
    id: "hazelnut-chocolate",
    name: "Hazelnut Chocolate",
    thaiName: "เค้กช็อกโกแลตเฮเซลนัท",
    category: "Cake & Cream",
    image: `${productImageRoot}/hazelnut-chocolate.webp`,
    accent: "#6552a4",
    softAccent: "#f3efff",
    description: "เค้กช็อกโกแลตเฮเซลนัทกับแพ็กเกจสีม่วงโดดเด่น",
  },
  {
    id: "blueberry-cake",
    name: "Blueberry Cake",
    thaiName: "บลูเบอร์รีเค้ก",
    category: "Cake & Cream",
    image: `${productImageRoot}/blueberry-cake.webp`,
    accent: "#4564b3",
    softAccent: "#eef2ff",
    description: "เค้กรสบลูเบอร์รีในแพ็กเกจลายผลไม้ที่มองเห็นชัดเจน",
  },
  {
    id: "mini-cream-cake",
    name: "Mini Cream Cake",
    thaiName: "มินิครีมเค้ก",
    category: "Cake & Cream",
    image: `${productImageRoot}/mini-cream-cake.webp`,
    accent: "#b9912a",
    softAccent: "#fff9e8",
    description: "มินิครีมเค้กขนาดกะทัดรัดในโทนสีครีม",
  },
  {
    id: "banana-cream-filling",
    name: "Banana Cream Filling",
    thaiName: "มินิเค้กสอดไส้ครีมกลิ่นกล้วยหอม",
    category: "Cake & Cream",
    image: `${productImageRoot}/banana-cream-filling.webp`,
    accent: "#d1a122",
    softAccent: "#fff8df",
    description: "มินิเค้กสอดไส้ครีมกลิ่นกล้วยหอมในแพ็กเกจสีเหลืองนุ่มนวล",
  },
];

export const featuredProductShowcaseItems =
  productShowcaseItems.filter((product) => product.featured);
