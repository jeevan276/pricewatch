import type {
  Product,
  ProductTrackResponse,
} from "../../types/product";

import DashboardContainer from "../common/DashboardContainer";
import ProductCard from "../productcard/productCard";
import ProductForm from "../productform/productForm";

interface LoggedInHomeProps {
  products: Product[];

  addProduct: (
    url: string,
  ) => Promise<ProductTrackResponse | null>;

  removeProduct: (
    id: number,
  ) => Promise<void>;

  loading: boolean;

  error: string | null;
}

export default function LoggedInHome({
  products,
  addProduct,
  removeProduct,
  loading,
  error,
}: LoggedInHomeProps) {
  return (
    <DashboardContainer>
      {/* =====================================================
          PRODUCT TRACKING FORM
      ====================================================== */}
      <section
        id="product-form"
        className="scroll-mt-24"
      >
        <div
          className="
            rounded-2xl
            border
            border-border
            bg-card
            p-4
            text-card-foreground
            shadow-sm
            sm:p-6
          "
        >
          <div className="mb-5">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Track a New Product
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Paste a product URL to start tracking its price.
            </p>
          </div>

          <ProductForm
            addProduct={addProduct}
            loading={loading}
          />
        </div>
      </section>

   

      {/* =====================================================
          TRACKED PRODUCTS
      ====================================================== */}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">
            Your Tracked Products
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Products you are currently monitoring.
          </p>
        </div>

        {products.length === 0 ? (
          <div
            className="
              rounded-xl
              border
              border-border
              bg-card
              p-8
              text-center
              text-muted-foreground
            "
          >
            You are not tracking any products yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                removeProduct={removeProduct}
              />
            ))}
          </div>
        )}
      </section>
    </DashboardContainer>
  );
}