export default function ProductSkeleton() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-6 py-10">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8">
        <div className="h-10 w-64 rounded-lg bg-muted-foreground/20" />

        <div className="mt-3 h-5 w-96 max-w-full rounded-md bg-muted-foreground/20" />
      </div>

      {/* =====================================================
          PRODUCT COUNT
      ====================================================== */}

      <div className="mb-6 h-4 w-32 rounded bg-muted-foreground/20" />

      {/* =====================================================
          PRODUCT GRID
      ====================================================== */}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <article
            key={index}
            className="
              flex flex-col overflow-hidden
              rounded-2xl
              border border-border
              bg-card
              shadow-sm
            "
          >
            {/* =================================================
                PRODUCT IMAGE
            ================================================= */}

            <div
              className="
                relative flex h-64
                items-center justify-center
                overflow-hidden
                bg-muted
                p-6
              "
            >
              <div className="h-44 w-44 rounded-xl bg-muted-foreground/20" />

              {/* Tracking badge */}
              <div className="absolute left-3 top-3 h-7 w-24 rounded-full bg-muted-foreground/20" />
            </div>

            {/* =================================================
                PRODUCT INFORMATION
            ================================================= */}

            <div className="border-t border-border p-4">
              {/* Product title */}
              <div className="space-y-2">
                <div className="h-5 w-full rounded bg-muted-foreground/20" />

                <div className="h-5 w-3/4 rounded bg-muted-foreground/20" />
              </div>

              {/* Price + Button */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {/* Price */}
                <div className="h-10 w-28 rounded bg-muted-foreground/20" />

                {/* External button */}
                <div className="h-10 rounded-lg bg-muted-foreground/20" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}