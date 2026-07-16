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
      className={`brand-logo ${logoSizes[size]} ${className}`}
    />
  );
}