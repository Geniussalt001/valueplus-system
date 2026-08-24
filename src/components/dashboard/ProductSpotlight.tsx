import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  PackageSearch,
  Sparkles,
  X,
} from "lucide-react";

import {
  featuredProductShowcaseItems,
  productShowcaseItems,
} from "../../data/productShowcase";

import type {
  ProductShowcaseCategory,
} from "../../data/productShowcase";

const mascotImage = "/images/product-showcase/umi-umi-mascot.webp";

const categories: Array<"ทั้งหมด" | ProductShowcaseCategory> = [
  "ทั้งหมด",
  "Cake Roll",
  "Monster Bread",
  "Waffle",
  "Cake & Cream",
];

export function ProductSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mascotCheering, setMascotCheering] = useState(false);
  const mascotTimerRef = useRef<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState(
    featuredProductShowcaseItems[0]?.id ?? productShowcaseItems[0].id,
  );

  useEffect(() => {
    if (catalogOpen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) =>
        (current + 1) % featuredProductShowcaseItems.length,
      );
    }, 8000);

    return () => window.clearInterval(timer);
  }, [catalogOpen]);

  useEffect(() => () => {
    if (mascotTimerRef.current !== null) {
      window.clearTimeout(mascotTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const imageSources = [
      mascotImage,
      ...featuredProductShowcaseItems.map((product) => product.image),
    ];

    imageSources.forEach((source) => {
      const image = new Image();
      image.decoding = "async";
      image.src = source;
    });
  }, []);

  const activeProduct =
    featuredProductShowcaseItems[activeIndex] ?? productShowcaseItems[0];

  const moveSlide = (direction: -1 | 1) => {
    setActiveIndex((current) => {
      const next = current + direction;
      return (next + featuredProductShowcaseItems.length) %
        featuredProductShowcaseItems.length;
    });
  };

  const openCatalog = (productId = activeProduct.id) => {
    setSelectedProductId(productId);
    setCatalogOpen(true);
  };

  const cheerMascot = () => {
    setMascotCheering(false);
    window.requestAnimationFrame(() => setMascotCheering(true));

    if (mascotTimerRef.current !== null) {
      window.clearTimeout(mascotTimerRef.current);
    }
    mascotTimerRef.current = window.setTimeout(() => {
      setMascotCheering(false);
      mascotTimerRef.current = null;
    }, 1500);
  };

  return (
    <>
      <section
        className="product-spotlight"
        style={{
          "--spotlight-accent": activeProduct.accent,
          "--spotlight-soft": activeProduct.softAccent,
        } as React.CSSProperties}
        aria-label="สินค้า Umi Umi แนะนำ"
      >
        <div className="product-spotlight-copy">
          <span className="product-spotlight-eyebrow">
            <Sparkles size={15} />
            UMI UMI PRODUCT SPOTLIGHT
          </span>
          <div
            key={activeProduct.id}
            className="product-spotlight-copy-content"
          >
            <p className="product-spotlight-greeting">น้อง Umi ขอแนะนำ</p>
            <h2>{activeProduct.name}</h2>
            <p className="product-spotlight-thai-name">{activeProduct.thaiName}</p>
            <p className="product-spotlight-description">{activeProduct.description}</p>
          </div>

          <div className="product-spotlight-actions">
            <button
              type="button"
              className="product-spotlight-primary"
              onClick={() => openCatalog()}
            >
              ดูรายละเอียดสินค้า
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="product-spotlight-secondary"
              onClick={() => openCatalog(productShowcaseItems[0].id)}
            >
              <Grid2X2 size={17} />
              สินค้าทั้งหมด {productShowcaseItems.length} รายการ
            </button>
          </div>

          <div className="product-spotlight-pagination" aria-label="เลือกสินค้าเด่น">
            {featuredProductShowcaseItems.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                onClick={() => setActiveIndex(index)}
                aria-label={`แสดง ${product.thaiName}`}
                aria-current={index === activeIndex}
              />
            ))}
          </div>
        </div>

        <div className="product-spotlight-stage">
          <span className="product-spotlight-glow" />
          <span className="product-spotlight-orbit product-spotlight-orbit-one" aria-hidden="true" />
          <span className="product-spotlight-orbit product-spotlight-orbit-two" aria-hidden="true" />
          <div key={activeProduct.id} className="product-spotlight-product-shell">
            <span className="product-spotlight-shine" aria-hidden="true" />
            <img
              className="product-spotlight-product"
              src={activeProduct.image}
              alt={activeProduct.thaiName}
            />
          </div>
          <button
            type="button"
            className={`product-spotlight-mascot-button ${mascotCheering ? "is-cheering" : ""}`}
            onClick={cheerMascot}
            aria-label="ทักทายน้อง Umi"
          >
            <span className="product-spotlight-mascot-sparkle sparkle-one" aria-hidden="true">✦</span>
            <span className="product-spotlight-mascot-sparkle sparkle-two" aria-hidden="true">✦</span>
            <span className="product-spotlight-mascot-motion">
              <img
                className="product-spotlight-mascot"
                src={mascotImage}
                alt="น้อง Umi"
              />
            </span>
          </button>
          <span className={`product-spotlight-bubble ${mascotCheering ? "is-cheering" : ""}`}>
            {mascotCheering ? "เย้! วันนี้ทำงานให้สนุกนะครับ!" : "กดทักทายน้อง Umi ได้นะ!"}
          </span>
        </div>

        <div className="product-spotlight-controls">
          <button type="button" onClick={() => moveSlide(-1)} aria-label="สินค้าก่อนหน้า">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => moveSlide(1)} aria-label="สินค้าถัดไป">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <ProductShowcaseDialog
        open={catalogOpen}
        selectedProductId={selectedProductId}
        onSelectedProductChange={setSelectedProductId}
        onClose={() => setCatalogOpen(false)}
      />
    </>
  );
}

interface ProductShowcaseDialogProps {
  open: boolean;
  selectedProductId: string;
  onSelectedProductChange: (productId: string) => void;
  onClose: () => void;
}

function ProductShowcaseDialog({
  open,
  selectedProductId,
  onSelectedProductChange,
  onClose,
}: ProductShowcaseDialogProps) {
  const [category, setCategory] = useState<"ทั้งหมด" | ProductShowcaseCategory>("ทั้งหมด");

  const selectedProduct =
    productShowcaseItems.find((product) => product.id === selectedProductId) ??
    productShowcaseItems[0];

  const visibleProducts = useMemo(
    () => category === "ทั้งหมด"
      ? productShowcaseItems
      : productShowcaseItems.filter((product) => product.category === category),
    [category],
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="product-showcase-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="product-showcase-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="สินค้า Umi Umi ทั้งหมด"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="product-showcase-header">
          <div>
            <span><PackageSearch size={16} /> VALUEPLUS PRODUCT SHOWCASE</span>
            <h2>สินค้า Umi Umi</h2>
            <p>รู้จักสินค้าเบเกอรี่ทั้งหมดผ่านน้อง Umi</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิดหน้าสินค้า">
            <X size={20} />
          </button>
        </header>

        <div className="product-showcase-filters" aria-label="หมวดสินค้า">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "is-active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="product-showcase-body">
          <div className="product-showcase-grid" aria-label="รายการสินค้า">
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`product-showcase-card ${selectedProduct.id === product.id ? "is-selected" : ""}`}
                onClick={() => onSelectedProductChange(product.id)}
                style={{ "--product-accent": product.accent } as React.CSSProperties}
              >
                <span className="product-showcase-card-image">
                  <img src={product.image} alt={product.thaiName} />
                </span>
                <span className="product-showcase-card-category">{product.category}</span>
                <strong>{product.name}</strong>
                <small>{product.thaiName}</small>
              </button>
            ))}
          </div>

          <aside
            className="product-showcase-detail"
            style={{
              "--product-accent": selectedProduct.accent,
              "--product-soft": selectedProduct.softAccent,
            } as React.CSSProperties}
          >
            <div className="product-showcase-detail-visual">
              <span className="product-showcase-detail-badge">สินค้าแนะนำ</span>
              <img src={selectedProduct.image} alt={selectedProduct.thaiName} />
            </div>
            <span className="product-showcase-detail-category">{selectedProduct.category}</span>
            <h3>{selectedProduct.name}</h3>
            <h4>{selectedProduct.thaiName}</h4>
            <p>{selectedProduct.description}</p>
            <div className="product-showcase-mascot-note">
              <img src={mascotImage} alt="น้อง Umi" />
              <span>น้อง Umi พร้อมช่วยแนะนำสินค้าให้ทุกคนรู้จักมากขึ้นครับ!</span>
            </div>
          </aside>
        </div>
      </section>
    </div>,
    document.body,
  );
}
