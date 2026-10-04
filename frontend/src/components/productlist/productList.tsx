import ProductCard from "../productcard/productCard";
import type { Product } from "../../types/product";
import LandingProductSkeleton from "../skeleton/LandingProductSkeleton";

interface ProductListProps {
  products: Product[];
  loading: boolean;
  removeProduct: (id: number) => Promise<void>;
}

export default function ProductList({
  products,
  loading,
  removeProduct,
}: ProductListProps) {
  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <LandingProductSkeleton count={products.length || 6} />
      </div>
    );
  }

  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  if (products.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-border bg-card px-6 py-8">
        <p className="text-center text-sm text-muted-foreground">
          No tracked products yet.
        </p>
      </div>
    );
  }

  // ==========================================================
  // PRODUCT LIST
  // ==========================================================

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          removeProduct={removeProduct}
        />
      ))}
    </div>
  );
}