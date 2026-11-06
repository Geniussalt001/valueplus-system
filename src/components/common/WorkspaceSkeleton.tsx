interface WorkspaceSkeletonProps {
  compact?: boolean;
}

export function WorkspaceSkeleton({
  compact = false,
}: WorkspaceSkeletonProps) {
  return (
    <div
      className={`vp-workspace-skeleton ${compact ? "vp-workspace-skeleton-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="กำลังเตรียมพื้นที่ทำงาน"
    >
      <div className="vp-skeleton-heading">
        <span className="vp-skeleton-line vp-skeleton-line-short" />
        <span className="vp-skeleton-line vp-skeleton-line-title" />
        <span className="vp-skeleton-line vp-skeleton-line-copy" />
      </div>

      <div className="vp-skeleton-hero">
        <div>
          <span className="vp-skeleton-line vp-skeleton-line-short" />
          <span className="vp-skeleton-line vp-skeleton-line-title" />
          <span className="vp-skeleton-line vp-skeleton-line-copy" />
        </div>
        <span className="vp-skeleton-orb" />
      </div>

      <div className="vp-skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="vp-skeleton-card" key={index}>
            <span className="vp-skeleton-icon" />
            <span className="vp-skeleton-line vp-skeleton-line-short" />
            <span className="vp-skeleton-line vp-skeleton-line-card-title" />
            <span className="vp-skeleton-line vp-skeleton-line-copy" />
          </div>
        ))}
      </div>

      <span className="sr-only">กำลังโหลด...</span>
    </div>
  );
}
