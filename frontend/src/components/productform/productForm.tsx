import { useState } from "react";

import type { ProductTrackResponse } from "../../types/product";

interface ProductFormProps {
  addProduct: (
    url: string,
  ) => Promise<ProductTrackResponse | null>;
  loading: boolean;
}

const SUPPORTED_DOMAINS = [
  "daraz.com.np",
  "hamrobazaar.com",
  "onlinesaathi.com",
  "my-choice-ecom.vercel.app",
];

function validateProductUrl(value: string): string | null {
  const trimmedUrl = value.trim();

  if (!trimmedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "URL must use HTTP or HTTPS.";
    }

    if (parsedUrl.username || parsedUrl.password) {
      return "URL must not contain username or password.";
    }

    if (
      parsedUrl.port &&
      !["80", "443"].includes(parsedUrl.port)
    ) {
      return "URL must use port 80 or 443.";
    }

    const hostname = parsedUrl.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    if (!SUPPORTED_DOMAINS.includes(hostname)) {
      return "Unsupported website. Use Daraz, HamroBazar, OnlineSaathi, or MyChoice.";
    }

    return null;
  } catch {
    return "Please enter a valid product URL.";
  }
}

export default function ProductForm({
  addProduct,
  loading,
}: ProductFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);

    const trimmedValue = value.trim();

    // Do not show an error for an empty field while typing.
    if (!trimmedValue) {
      setError(null);
      return;
    }

    // Validate immediately on every change.
    setError(validateProductUrl(trimmedValue));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const trimmedUrl = url.trim();
    const validationError = validateProductUrl(trimmedUrl);

    if (!trimmedUrl) {
      setError("Please enter a product URL.");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);

      const response = await addProduct(trimmedUrl);

      if (response) {
        setUrl("");
        setError(null);
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
        <div className="min-w-0 flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Paste product URL..."
            className={`
              block
              h-12
              w-full
              min-w-0
              rounded-lg
              border
              bg-background
              px-3
              py-3
              text-sm
              text-foreground
              placeholder:text-muted-foreground
              focus:outline-none
              focus:ring-2
              focus:ring-offset-2
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:text-base
              ${
                error
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-muted-foreground"
              }
            `}
            disabled={loading}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "product-url-error" : undefined
            }
          />
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(error) || !url.trim()}
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

      {error && (
        <p
          id="product-url-error"
          role="alert"
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

