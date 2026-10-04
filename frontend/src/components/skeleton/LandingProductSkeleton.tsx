interface LandingProductSkeletonProps {
  count: number;
}

export default function LandingProductSkeleton({
  count,
}: LandingProductSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="
            flex w-full max-w-sm
            animate-pulse items-center gap-3
            rounded-xl border border-border
            bg-card p-2 shadow-sm
          "
        >
          {/* Product Image */}
          <div className="h-[50px] w-[50px] shrink-0 rounded-md bg-muted" />

          {/* Product Information */}
          <div className="min-w-0 flex-1">
            {/* Product Name */}
            <div className="h-3 w-3/4 rounded bg-muted" />

            {/* Product Price */}
            <div className="mt-2 h-4 w-20 rounded bg-muted" />

            {/* Actions */}
            <div className="mt-1 flex items-center gap-1">
              <div className="h-6 w-12 rounded bg-muted" />
              <div className="h-6 w-12 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}