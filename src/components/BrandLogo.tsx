interface BrandLogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const logoSizes = {
  small: "w-36",
  medium: "w-52",
  large: "w-72",
};

export function BrandLogo({
  size = "medium",
  className = "",
}: BrandLogoProps) {
  return (
    <div
      role="img"
      aria-label="ValuePlus Retail Co., Ltd."
      className={`
        ${logoSizes[size]}
        ${className}
      `}
      style={{
        aspectRatio: "650 / 239",
        background:
          "linear-gradient(105deg, #ffffff 0%, #cffafe 38%, #67e8f9 68%, #38bdf8 100%)",
        maskImage:
          "url('/images/valueplus-logo.png')",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage:
          "url('/images/valueplus-logo.png')",
        WebkitMaskPosition:
          "center",
        WebkitMaskRepeat:
          "no-repeat",
        WebkitMaskSize:
          "contain",
        filter:
          "drop-shadow(0 0 13px rgba(34, 211, 238, 0.25))",
      }}
    />
  );
}