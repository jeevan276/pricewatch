import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MoveUpRight } from "lucide-react";

import {
  checkProductNow,
  getProductHistory,
  setProductThreshold,
} from "../api/productApi";

import type { ProductHistoryResponse } from "../types/product";

import PriceChart from "../components/pricechart/priceChart";
import ProductDetailsSkeleton from "../components/skeleton/ProductDetailsSkeleton";
import PriceThreshold from "../components/productform/PriceThreshold";

import { retailerLink } from "../utills/retailer";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();

  return <ProductDetailsContent key={id} id={id} />;
}

function ProductDetailsContent({
  id,
}: {
  id: string | undefined;
}) {
  const [data, setData] = useState<ProductHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFullName, setShowFullName] = useState(false);
  const [isNameTruncated, setIsNameTruncated] = useState(false);

  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [savingThreshold, setSavingThreshold] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const requests = useRef(0);
  const pendingCheck = useRef(false);
  const pendingThreshold = useRef(false);
  const mounted = useRef(true);

  /*
   * Track component mount state so async requests
   * do not update state after unmount.
   */
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  /*
   * Validate product ID once.
   */
  const productId = id ? Number(id) : NaN;
  const isValidProductId =
    Number.isSafeInteger(productId) && productId > 0;

  /*
   * Check product price immediately.
   */
  const checkNow = async () => {
    if (
      pendingCheck.current ||
      pendingThreshold.current ||
      !isValidProductId
    ) {
      return;
    }

    pendingCheck.current = true;

    const requestId = ++requests.current;

    setChecking(true);
    setCheckError(null);

    try {
      const response = await checkProductNow(productId);

      if (
        mounted.current &&
        requests.current === requestId
      ) {
        setData(response);
        setError(null);
      }
    } catch {
      if (mounted.current) {
        setCheckError(
          "The check could not finish. Your saved price history is still available. Please try again."
        );
      }
    } finally {
      pendingCheck.current = false;

      if (mounted.current) {
        setChecking(false);
      }
    }
  };

  /*
   * Save or remove target price.
   */
  const saveThreshold = async (target: number | null) => {
    if (
      !isValidProductId ||
      pendingCheck.current ||
      pendingThreshold.current
    ) {
      throw new Error(
        "A product update is already pending."
      );
    }

    pendingThreshold.current = true;

    ++requests.current;

    setSavingThreshold(true);

    try {
      const product = await setProductThreshold(
        productId,
        target
      );

      if (mounted.current) {
        setData((current) =>
          current
            ? {
                ...current,
                product,
              }
            : current
        );
      }
    } finally {
      pendingThreshold.current = false;

      if (mounted.current) {
        setSavingThreshold(false);
      }
    }
  };

  /*
   * Load product history.
   */
  useEffect(() => {
    if (!isValidProductId) {
      return;
    }

    let active = true;

    const loadProductHistory = async (
      showLoading: boolean
    ) => {
      if (
        pendingCheck.current ||
        pendingThreshold.current
      ) {
        return;
      }

      const requestId = ++requests.current;

      try {
        if (showLoading) {
          setLoading(true);
        }

        setError(null);

        const response = await getProductHistory(
          productId
        );

        if (
          active &&
          mounted.current &&
          requestId === requests.current
        ) {
          setData(response);
        }
      } catch (err) {
        console.error(
          "Failed to load product history:",
          err
        );

        if (
          active &&
          mounted.current &&
          requestId === requests.current
        ) {
          setError(
            "Failed to load product details. Please try again."
          );
        }
      } finally {
        if (showLoading && active) {
          setLoading(false);
        }
      }
    };

    void loadProductHistory(true);

    /*
     * Refresh price history every five minutes.
     */
    const intervalId = window.setInterval(() => {
      void loadProductHistory(false);
    }, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [productId, isValidProductId]);

  /*
   * Detect whether the product name is truncated.
   */
  useEffect(() => {
    const element = titleRef.current;

    if (!element) {
      return;
    }

    const checkTruncation = () => {
      setIsNameTruncated(
        element.scrollHeight > element.clientHeight + 1
      );
    };

    checkTruncation();

    const resizeObserver = new ResizeObserver(
      checkTruncation
    );

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data?.product.name]);

  /*
   * Missing product ID.
   */
  if (!id) {
    return (
      <MessageState message="Product ID is missing." />
    );
  }

  /*
   * Invalid product ID.
   */
  if (!isValidProductId) {
    return (
      <MessageState message="Invalid product ID." />
    );
  }

  /*
   * Loading state.
   */
  if (loading) {
    return <ProductDetailsSkeleton />;
  }

  /*
   * Error state.
   */
  if (error && !data) {
    return (
      <MessageState
        message={error}
        destructive
      />
    );
  }

  /*
   * No product data.
   */
  if (!data) {
    return (
      <MessageState message="Product not found." />
    );
  }

  const { product, history } = data;

  const buyingLink = retailerLink(product.url);

  /*
   * Price statistics.
   */
  const prices = history
    .map((item) => Number(item.price))
    .filter(Number.isFinite);

  const currentPrice = Number(product.price);

  const lowestPrice =
    prices.length > 0
      ? Math.min(...prices)
      : currentPrice;

  const highestPrice =
    prices.length > 0
      ? Math.max(...prices)
      : currentPrice;

  /*
   * Sort history from oldest to newest.
   */
  const sortedHistory = [...history].sort(
    (a, b) =>
      new Date(a.checked_at).getTime() -
      new Date(b.checked_at).getTime()
  );

  /*
   * Calculate price change.
   */
  const previousPrice =
    sortedHistory.length > 1
      ? Number(
          sortedHistory[sortedHistory.length - 2].price
        )
      : currentPrice;

  const priceDifference =
    currentPrice - previousPrice;

  const percentageChange =
    previousPrice !== 0
      ? (priceDifference / previousPrice) * 100
      : 0;

  const isPriceDown = priceDifference < 0;
  const isPriceUp = priceDifference > 0;

  const priceChangeClass = isPriceDown
    ? "text-green-600 dark:text-green-400"
    : isPriceUp
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground";

  /*
   * Availability information.
   */
  const isRemoved =
    product.availability === "removed";

  const isOutOfStock =
    product.availability === "out_of_stock";

  const availabilityMessage = isRemoved
    ? `This product has been removed from ${
        product.url.includes("daraz.com.np")
          ? "Daraz"
          : "the retailer"
      }. The price shown is the last recorded price.`
    : isOutOfStock
      ? "This product is currently out of stock."
      : product.availability === "available"
        ? "This product was available at the last successful check."
        : "Availability has not yet been verified.";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-12">

        {/* Product Summary */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">

            {/* Product Image */}
            <div className="flex h-64 w-full items-center justify-center overflow-hidden rounded-lg bg-muted md:h-56 md:w-1/2">
              <img
                src={
                  product.image_url ||
                  "/pwlogo.PNG"
                }
                alt={product.name}
                className="h-full w-full object-contain p-4"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src =
                    "/pwlogo.PNG";
                }}
              />
            </div>

            {/* Product Information */}
            <div className="min-w-0 flex-1">

              {/* Product Name */}
              <div>
                <h1
                  ref={titleRef}
                  className={`text-2xl font-bold text-card-foreground md:text-3xl ${
                    showFullName
                      ? ""
                      : "line-clamp-2"
                  }`}
                >
                  {product.name}
                </h1>

                {isNameTruncated && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowFullName(
                        (previous) => !previous
                      )
                    }
                    className="mt-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {showFullName
                      ? "Read less"
                      : "Read more"}
                  </button>
                )}
              </div>

              {/* Current Price */}
              <p className="mt-5 text-3xl font-bold text-card-foreground">
                Rs. {currentPrice.toLocaleString()}
              </p>

              {/* Price Change */}
              {history.length > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-lg font-semibold ${priceChangeClass}`}
                  >
                    {isPriceDown
                      ? "↓"
                      : isPriceUp
                        ? "↑"
                        : "—"}{" "}
                    Rs.{" "}
                    {Math.abs(
                      priceDifference
                    ).toLocaleString()}
                  </span>

                  <span
                    className={`text-sm font-medium ${priceChangeClass}`}
                  >
                    {percentageChange === 0
                      ? "0.00%"
                      : `${Math.abs(
                          percentageChange
                        ).toFixed(2)}%`}
                  </span>
                </div>
              )}

              {/* Buy Button */}
              {buyingLink && (
                <a
                  href={buyingLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Buy on {buyingLink.name}

                  <MoveUpRight
                    size={16}
                    className="ml-2"
                  />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Product Status */}
        <section
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
          aria-live="polite"
        >
          <div className="space-y-2">

            <p
              role={isRemoved ? "status" : undefined}
              className={`font-semibold ${
                isRemoved
                  ? "text-destructive"
                  : isOutOfStock
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
              }`}
            >
              {availabilityMessage}
            </p>

            {isRemoved && (
              <p className="text-sm text-muted-foreground">
                Your price history has been preserved.
              </p>
            )}

            {product.last_checked_at && (
              <p className="text-sm text-muted-foreground">
                Last checked:{" "}
                {new Date(
                  product.last_checked_at
                ).toLocaleString()}
              </p>
            )}

            {product.last_successful_check_at && (
              <p className="text-sm text-muted-foreground">
                Last verified price:{" "}
                {new Date(
                  product.last_successful_check_at
                ).toLocaleString()}
              </p>
            )}

            {product.last_check_error && (
              <p
                role="status"
                className="text-sm text-amber-600 dark:text-amber-400"
              >
                The latest retailer check failed.
                Availability and price reflect the
                last verified result.
              </p>
            )}

            {(checkError || error) && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {checkError || error}
              </p>
            )}
          </div>

          {/* Check Now */}
          <button
            type="button"
            onClick={() => void checkNow()}
            disabled={
              checking || savingThreshold
            }
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking
              ? "Checking retailer…"
              : "Check now"}
          </button>
        </section>

        {/* Price Alert */}
        <PriceThreshold
          key={product.id}
          product={product}
          busy={
            checking || savingThreshold
          }
          onSave={saveThreshold}
        />

        {/* Price History */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-card-foreground">
              Price History
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Prices verified by PriceWatch since
              tracking began.
            </p>
          </div>

          {history.length > 0 ? (
            <PriceChart history={history} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                No price history available yet.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Automatic checks run every five minutes
            while monitoring is active. Older
            prices are not available through the
            public history API.
          </p>
        </section>

        {/* Price Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Lowest Price */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Lowest Price
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
              Rs. {lowestPrice.toLocaleString()}
            </p>
          </div>

          {/* Highest Price */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Highest Price
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
              Rs. {highestPrice.toLocaleString()}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/*
 * Reusable message state.
 */
function MessageState({
  message,
  destructive = false,
}: {
  message: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center bg-background px-4">
      <p
        className={
          destructive
            ? "text-destructive"
            : "text-muted-foreground"
        }
      >
        {message}
      </p>
    </div>
  );
}

