import { Link } from "react-router-dom";
import type { Product } from "../../types/product";

interface ProductCardProps {
  product: Product;
  removeProduct: (id: number) => Promise<void>;
}

export default function ProductCard({
  product,
  removeProduct,
}: ProductCardProps) {
  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-card p-2 shadow-sm transition hover:shadow-md">
      {/* Product Image */}
      <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-background">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <img
            src="/pwlogo.PNG"
            alt="PriceWatch"
            className="h-full w-full object-contain p-1"
            loading="lazy"
          />
        )}
      </div>

      {/* Product Information */}
      <div className="min-w-0 flex-1">
        {/* Product Name */}
        <h2
          title={product.name}
          className="truncate text-xs font-semibold text-foreground"
        >
          {product.name}
        </h2>

        {/* Product Price */}
        <p className="text-sm font-bold text-green-600 dark:text-green-400">
          Rs. {product.price.toLocaleString()}
        </p>

        {/* Target Price */}
        {product.target_price != null && (
          <p className="text-[10px] text-muted-foreground">
            Target: Rs. {product.target_price.toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="mt-1 flex items-center gap-1">
          <Link
            to={`/product/${product.id}`}
            className="rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background transition hover:bg-foreground/80"
          >
            Details
          </Link>

          <button
            type="button"
            onClick={() => removeProduct(product.id)}
            className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

