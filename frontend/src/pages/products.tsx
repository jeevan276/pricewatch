import { ExternalLink, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

import { useProducts } from "../hooks/useProducts";
import NotificationSettings from "../components/notifications/NotificationSettings";
import ProductSkeleton from "../components/skeleton/ProductSkeleton";

export default function Products() {
  const { products, fetching: loading, error, fetchProducts } = useProducts();

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <ProductSkeleton />;
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <main className="flex min-h-[500px] items-center justify-center bg-background px-6">
        <div><p className="text-destructive">{error}</p>
          <button type="button" onClick={() => void fetchProducts()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground">Retry</button>
        </div>
      </main>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Tracked Products
          </h1>

          <p className="mt-2 text-muted-foreground">
            All products currently being tracked by PriceWatch.
          </p>
        </div>

        {/* ======================================================
            NOTIFICATION SETTINGS
        ====================================================== */}

        <div className="mb-8">
          <NotificationSettings />
        </div>

        {/* ======================================================
            EMPTY STATE
        ====================================================== */}

        {products.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-card-foreground">
              No products tracked yet
            </h2>

            <p className="mt-2 text-muted-foreground">
              Add a product URL to start tracking its price.
            </p>

            <Link
              to="/"
              className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Start Tracking
            </Link>
          </div>
        ) : (
          <>
            {/* ==================================================
                PRODUCT COUNT
            ================================================== */}

            <div className="mb-6 text-sm text-muted-foreground">
              {products.length}{" "}
              {products.length === 1 ? "product" : "products"} tracked
            </div>

            {/* ==================================================
                PRODUCT GRID
            ================================================== */}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="
                    group
                    flex
                    flex-col
                    overflow-hidden
                    rounded-2xl
                    border
                    border-border
                    bg-card
                    shadow-sm
                    transition
                    duration-300
                    hover:-translate-y-1
                    hover:shadow-xl
                  "
                >
                  {/* ==================================================
                      PRODUCT IMAGE
                  ================================================== */}

                  <Link
                    to={`/product/${product.id}`}
                    className="
                      relative
                      flex
                      min-h-[240px]
                      flex-1
                      items-center
                      justify-center
                      overflow-hidden
                      bg-muted
                      p-6
                    "
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="
                          h-full
                          w-full
                          object-contain
                          transition
                          duration-500
                          group-hover:scale-105
                        "
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No image available
                      </div>
                    )}

                    {/* Tracking badge */}

                    <div
                      className="
                        absolute
                        left-3
                        top-3
                        flex
                        items-center
                        gap-1.5
                        rounded-full
                        border
                        border-border
                        bg-card/90
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-card-foreground
                        shadow-sm
                        backdrop-blur
                      "
                    >
                      <TrendingDown
                        size={14}
                        className="text-primary"
                      />

                      {product.availability === "removed" ? "Removed" : product.availability === "out_of_stock" ? "Out of stock" : "Tracking"}
                    </div>
                  </Link>

                  {/* ==================================================
                      PRODUCT INFORMATION
                  ================================================== */}

                  <div className="shrink-0 border-t border-border p-4">
                    <Link to={`/product/${product.id}`}>
                      <h2
                        title={product.name}
                        className="
                          line-clamp-2
                          min-h-[3rem]
                          text-base
                          font-semibold
                          leading-6
                          text-card-foreground
                          transition
                          hover:text-primary
                        "
                      >
                        {product.name}
                      </h2>
                    </Link>

                    {/* ==================================================
                        PRICE + EXTERNAL LINK
                    ================================================== */}

                    <div className="mt-4 grid grid-cols-2 items-center gap-2">
                      <p className="text-xl font-bold text-foreground">
                        Rs. {product.price.toLocaleString()}
                      </p>

                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          flex
                          items-center
                          justify-center
                          gap-1.5
                          rounded-lg
                          bg-primary
                          px-3
                          py-2
                          text-sm
                          font-semibold
                          text-primary-foreground
                          transition
                          hover:opacity-90
                        "
                      >
                        View
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}