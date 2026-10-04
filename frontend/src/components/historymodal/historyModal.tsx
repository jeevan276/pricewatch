import { useEffect, useState } from "react";

import { getProductHistory } from "../../api/productApi";

import type {
  Product,
  PriceHistory,
} from "../../types/product";

import PriceChart from "../pricechart/priceChart";

interface HistoryModalProps {
  product: Product;
  onClose: () => void;
}

export default function HistoryModal({
  product,
  onClose,
}: HistoryModalProps) {
  const [history, setHistory] = useState<PriceHistory[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await getProductHistory(product.id);

        setHistory(response.history);
      } catch (err) {
        console.error(err);

        setError(
          "Failed to load price history."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, [product.id]);

  const lowestPrice =
    history.length > 0
      ? Math.min(
          ...history.map((item) => item.price)
        )
      : product.price;

  const highestPrice =
    history.length > 0
      ? Math.max(
          ...history.map((item) => item.price)
        )
      : product.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="price-history-title"
    className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
  >
    {/* Header */}
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2
          id="price-history-title"
          className="truncate text-xl font-bold text-foreground sm:text-2xl"
        >
          {product.name}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Current Price:{" "}
          <strong className="text-lg font-bold text-foreground">
            Rs. {product.price.toLocaleString()}
          </strong>
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close price history"
        className="
          shrink-0 rounded-lg px-3 py-2
          text-sm font-medium
          text-muted-foreground
          transition-colors
          hover:bg-accent
          hover:text-foreground
          focus:outline-none
          focus:ring-2
          focus:ring-primary/30
        "
      >
        Close
      </button>
    </div>

    {/* Loading */}
    {loading && (
      <div className="mt-8 flex items-center justify-center rounded-xl border border-border bg-background p-8">
        <p className="text-sm text-muted-foreground">
          Loading price history...
        </p>
      </div>
    )}

    {/* Error */}
    {error && (
      <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          {error}
        </p>
      </div>
    )}

    {/* Content */}
    {!loading && !error && (
      <div className="mt-8 space-y-6">
        {/* Price Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Lowest Price */}
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Lowest Price
            </p>

            <strong className="mt-2 block text-2xl font-bold text-green-600 dark:text-green-400">
              Rs. {lowestPrice.toLocaleString()}
            </strong>
          </div>

          {/* Highest Price */}
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="text-sm font-medium text-muted-foreground">
              Highest Price
            </p>

            <strong className="mt-2 block text-2xl font-bold text-red-600 dark:text-red-400">
              Rs. {highestPrice.toLocaleString()}
            </strong>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border bg-background p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Price History
          </h3>

          <PriceChart history={history} />
        </div>
      </div>
    )}
  </div>
</div>
  );
}