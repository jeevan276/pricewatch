export default function PriceChartSkeleton() {
  return (
    <div className="w-full animate-pulse">
      {/* Chart Container */}
      <div className="relative h-[350px] w-full overflow-hidden rounded-xl border border-border bg-card">
        {/* Y Axis Labels */}
        <div className="absolute left-0 top-8 flex h-[270px] flex-col justify-between">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>

        {/* Chart Area */}
        <div className="absolute bottom-12 left-16 right-4 top-5">
          {/* Horizontal Grid Lines */}
          <div className="absolute left-0 right-0 top-0 border-t border-dashed border-border" />
          <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-border" />
          <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-border" />
          <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-border" />
          <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-border" />

          {/* Fake Chart Line */}
          <div className="absolute inset-0">
            <svg
              viewBox="0 0 600 260"
              preserveAspectRatio="none"
              className="h-full w-full"
              aria-hidden="true"
            >
              <path
                d="M0 210 L80 175 L150 190 L230 120 L300 145 L370 90 L450 115 L520 55 L600 75"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted"
              />

              {/* Fake Data Points */}
              <circle
                cx="80"
                cy="175"
                r="5"
                className="fill-muted"
              />

              <circle
                cx="150"
                cy="190"
                r="5"
                className="fill-muted"
              />

              <circle
                cx="230"
                cy="120"
                r="5"
                className="fill-muted"
              />

              <circle
                cx="300"
                cy="145"
                r="5"
                className="fill-muted"
              />

              <circle
                cx="370"
                cy="90"
                r="5"
                className="fill-muted"
              />

              <circle
                cx="450"
                cy="115"
                r="5"
                className="fill-muted"
              />

              <circle
                cx="520"
                cy="55"
                r="5"
                className="fill-muted"
              />
            </svg>
          </div>
        </div>

        {/* X Axis Labels */}
        <div className="absolute bottom-2 left-16 right-4 flex justify-between">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}