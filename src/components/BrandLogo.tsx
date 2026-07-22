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
        brand-logo
        ${logoSizes[size]}
        ${className}
      `}
      style={{
        aspectRatio: "650 / 239",
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
      }}
    />
  );
}
