export default function ProductDetailsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 py-30">
      {/* =====================================================
          PRODUCT SUMMARY SKELETON
      ====================================================== */}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* PRODUCT IMAGE */}
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-muted md:h-56 md:w-1/2">
            <div className="h-40 w-40 rounded-lg bg-muted-foreground/20" />
          </div>

          {/* PRODUCT INFORMATION */}
          <div className="flex-1">
            {/* PRODUCT NAME */}
            <div className="space-y-2">
              <div className="h-7 w-full rounded bg-muted-foreground/20 md:h-8" />
              <div className="h-7 w-4/5 rounded bg-muted-foreground/20 md:h-8" />
            </div>

            {/* READ MORE */}
            <div className="mt-2 h-4 w-20 rounded bg-muted-foreground/20" />

            {/* CURRENT PRICE */}
            <div className="mt-6 h-10 w-40 rounded bg-muted-foreground/20" />

            {/* PRICE CHANGE */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-6 w-24 rounded bg-muted-foreground/20" />
              <div className="h-5 w-16 rounded bg-muted-foreground/20" />
            </div>

            {/* VIEW PRODUCT BUTTON */}
            <div className="mt-6 h-12 w-36 rounded-lg bg-muted-foreground/20" />
          </div>
        </div>
      </div>

      {/* =====================================================
          PRICE HISTORY SKELETON
      ====================================================== */}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-muted-foreground/20" />

          <div className="h-4 w-32 rounded bg-muted-foreground/20" />
        </div>

        {/* CHART */}
        <div className="relative h-[350px] w-full">
          {/* Y AXIS */}
          <div className="absolute left-0 top-5 flex h-[270px] flex-col justify-between">
            <div className="h-3 w-12 rounded bg-muted-foreground/20" />
            <div className="h-3 w-10 rounded bg-muted-foreground/20" />
            <div className="h-3 w-12 rounded bg-muted-foreground/20" />
            <div className="h-3 w-10 rounded bg-muted-foreground/20" />
            <div className="h-3 w-12 rounded bg-muted-foreground/20" />
          </div>

          {/* CHART AREA */}
          <div className="absolute bottom-10 left-16 right-4 top-5">
            {/* GRID */}
            <div className="absolute left-0 right-0 top-0 border-t border-dashed border-border" />
            <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-border" />
            <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-border" />
            <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-border" />
            <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-border" />

            {/* FAKE LINE */}
            <svg
              viewBox="0 0 600 260"
              preserveAspectRatio="none"
              className="h-full w-full text-muted-foreground/20"
            >
              <path
                d="M0 210 L80 175 L150 190 L230 120 L300 145 L370 90 L450 115 L520 55 L600 75"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />

              {/* DATA POINTS */}
              <circle
                cx="80"
                cy="175"
                r="5"
                className="fill-current"
              />

              <circle
                cx="150"
                cy="190"
                r="5"
                className="fill-current"
              />

              <circle
                cx="230"
                cy="120"
                r="5"
                className="fill-current"
              />

              <circle
                cx="300"
                cy="145"
                r="5"
                className="fill-current"
              />

              <circle
                cx="370"
                cy="90"
                r="5"
                className="fill-current"
              />

              <circle
                cx="450"
                cy="115"
                r="5"
                className="fill-current"
              />

              <circle
                cx="520"
                cy="55"
                r="5"
                className="fill-current"
              />
            </svg>
          </div>

          {/* X AXIS */}
          <div className="absolute bottom-0 left-16 right-4 flex justify-between">
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
          </div>
        </div>
      </div>

      {/* =====================================================
          PRICE STATISTICS SKELETON
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* LOWEST PRICE */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-28 rounded bg-muted-foreground/20" />

          <div className="mt-3 h-8 w-36 rounded bg-muted-foreground/20" />
        </div>

        {/* HIGHEST PRICE */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-28 rounded bg-muted-foreground/20" />

          <div className="mt-3 h-8 w-36 rounded bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}