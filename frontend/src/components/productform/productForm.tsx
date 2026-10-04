import { useState } from "react";
import type { ProductTrackResponse } from "../../types/product";

interface ProductFormProps {
  addProduct: (
    url: string,
  ) => Promise<ProductTrackResponse | null>;

  loading: boolean;
}

export default function ProductForm({
  addProduct,
  loading,
}: ProductFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please enter a product URL.");
      return;
    }

    try {
      setError(null);

      const response = await addProduct(trimmedUrl);

      if (response) {
        setUrl("");
      } else {
        setError("Failed to track product.");
      }
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(
          "We couldn't track this product. Please try again.",
        );
      }
    }
  };

  return (
    <div className="w-full min-w-0">
      <form
        onSubmit={handleSubmit}
        className="
          flex
          w-full
          min-w-0
          flex-col
          gap-3
          sm:flex-row
          sm:items-stretch
        "
      >
        {/* Product URL Input */}
        <div className="min-w-0 flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste product URL..."
            className="
              block
              h-12
              w-full
              min-w-0
              rounded-lg
              border
              border-gray-300
              bg-background
              px-3
              py-3
              text-sm
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-muted-foreground
              focus:ring-offset-2
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:text-base
            "
            disabled={loading}
            required
          />
        </div>

        {/* Track Product Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            h-12
            w-full
            shrink-0
            rounded-lg
            bg-primary
            px-5
            py-3
            text-sm
            font-medium
            text-white
            transition
            hover:bg-primary
            focus:outline-none
            focus:ring-2
            focus:ring-primary
            focus:ring-offset-2
            disabled:cursor-not-allowed
            disabled:opacity-50
            sm:w-auto
            sm:min-w-[140px]
            sm:px-6
            sm:text-base
          "
        >
          {loading ? "Tracking..." : "Track Product"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <p
          className="
            mt-3
            break-words
            text-sm
            leading-relaxed
            text-red-600
            sm:mt-4
          "
        >
          {error}
        </p>
      )}
    </div>
  );
}

