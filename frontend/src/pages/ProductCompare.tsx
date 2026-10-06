import { useState } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Trophy,
  X,
} from "lucide-react";

import { compareProducts } from "../api/productApi";
import type {
  CompareSiteResponse,
  ProductCompareRequest,
  ProductCompareResponse,
} from "../types/product";

interface WebsiteOption {
  key: keyof ProductCompareRequest;
  name: string;
  placeholder: string;
  domain: string;
}

const websites: WebsiteOption[] = [
  {
    key: "daraz_url",
    name: "Daraz",
    placeholder: "Paste Daraz product URL",
    domain: "daraz.com.np",
  },
  {
    key: "hamrobazar_url",
    name: "Hamrobazaar",
    placeholder: "Paste Hamrobazaar product URL",
    domain: "hamrobazaar.com",
  },
  {
    key: "onlinesaathi_url",
    name: "OnlineSathi",
    placeholder: "Paste OnlineSathi product URL",
    domain: "onlinesaathi.com",
  },
  {
    key: "mychoice_url",
    name: "MyChoice",
    placeholder: "Paste MyChoice product URL",
    domain: "my-choice-ecom.vercel.app",
  },
];

const getWebsite = (
  key: keyof ProductCompareRequest,
): WebsiteOption | undefined => {
  return websites.find((website) => website.key === key);
};

const isValidSupportedUrl = (
  key: keyof ProductCompareRequest,
  value: string,
): boolean => {
  const website = getWebsite(key);

  if (!website || !value.trim()) {
    return false;
  }

  try {
    const parsedUrl = new URL(value.trim());

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return false;
    }

    if (!parsedUrl.hostname) {
      return false;
    }

    if (parsedUrl.username || parsedUrl.password) {
      return false;
    }

    const hostname = parsedUrl.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return hostname === website.domain;
  } catch {
    return false;
  }
};

const getUrlValidationMessage = (
  key: keyof ProductCompareRequest,
  value: string,
): string | null => {
  const website = getWebsite(key);

  if (!website) {
    return "Invalid website selection.";
  }

  const trimmedUrl = value.trim();

  if (!trimmedUrl) {
    return `Please enter the ${website.name} product URL.`;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return `Please enter a valid ${website.name} product URL.`;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return `Please use a valid http or https ${website.name} URL.`;
  }

  if (!parsedUrl.hostname) {
    return `Please enter a valid ${website.name} product URL.`;
  }

  if (parsedUrl.username || parsedUrl.password) {
    return "URLs containing usernames or passwords are not allowed.";
  }

  const hostname = parsedUrl.hostname
    .toLowerCase()
    .replace(/^www\./, "");

  const isCorrectWebsite =
    hostname === website.domain;

  if (!isCorrectWebsite) {
    return `Please enter a ${website.name} product URL. Only ${website.name} URLs are allowed in this field.`;
  }

  return null;
};

export default function ProductCompare() {
  const [selectedSites, setSelectedSites] = useState<
    Array<keyof ProductCompareRequest>
  >([]);

  const [urls, setUrls] =
    useState<ProductCompareRequest>({});

  const [result, setResult] =
    useState<ProductCompareResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProductCompareRequest, string>>
  >({});

  // ============================================================
  // WEBSITE SELECTION
  // ============================================================

  const toggleSite = (
    key: keyof ProductCompareRequest,
  ) => {
    setSelectedSites((previous) => {
      if (previous.includes(key)) {
        return previous.filter(
          (site) => site !== key,
        );
      }

      return [...previous, key];
    });

    setUrls((previous) => ({
      ...previous,
      [key]: previous[key],
    }));

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });

    setError(null);
    setResult(null);
  };

  // ============================================================
  // URL INPUT
  // ============================================================

  const updateUrl = (
    key: keyof ProductCompareRequest,
    value: string,
  ) => {
    setUrls((previous) => ({
      ...previous,
      [key]: value,
    }));

    setError(null);
    setResult(null);

    /*
     * Do not show validation errors while the user is
     * entering a partial URL.
     */
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });

      return;
    }

    if (
      trimmedValue.startsWith("http://") ||
      trimmedValue.startsWith("https://")
    ) {
      const validationMessage =
        getUrlValidationMessage(
          key,
          trimmedValue,
        );

      setFieldErrors((previous) => {
        const next = { ...previous };

        if (validationMessage) {
          next[key] = validationMessage;
        } else {
          delete next[key];
        }

        return next;
      });
    }
  };

  // ============================================================
  // URL VALIDATION
  // ============================================================

  const validateSelectedUrls = (): boolean => {
    const errors: Partial<
      Record<keyof ProductCompareRequest, string>
    > = {};

    for (const site of selectedSites) {
      const url = urls[site]?.trim() ?? "";

      const validationMessage =
        getUrlValidationMessage(site, url);

      if (validationMessage) {
        errors[site] = validationMessage;
      }
    }

    setFieldErrors(errors);

    const firstError = selectedSites.find(
      (site) => errors[site],
    );

    if (firstError) {
      setError(errors[firstError] ?? null);
      return false;
    }

    return true;
  };

  const hasInvalidSelectedUrl = selectedSites.some(
    (site) => {
      const url = urls[site]?.trim() ?? "";

      return !isValidSupportedUrl(
        site,
        url,
      );
    },
  );

  // ============================================================
  // COMPARE
  // ============================================================

  const handleCompare = async () => {
    if (loading) return;

    setError(null);
    setResult(null);

    if (selectedSites.length < 2) {
      setError(
        "Please select at least two websites to compare.",
      );
      return;
    }

    if (!validateSelectedUrls()) {
      return;
    }

    const request: ProductCompareRequest = {};

    for (const site of selectedSites) {
      const url = urls[site]?.trim();

      /*
       * Final client-side validation before sending
       * anything to the backend.
       */
      if (
        !url ||
        !isValidSupportedUrl(site, url)
      ) {
        const validationMessage =
          getUrlValidationMessage(
            site,
            url ?? "",
          );

        setFieldErrors((previous) => ({
          ...previous,
          [site]:
            validationMessage ??
            "Please enter a valid supported product URL.",
        }));

        setError(
          validationMessage ??
            "Please check the product URLs and try again.",
        );

        return;
      }

      request[site] = url;
    }

    try {
      setLoading(true);

      const response =
        await compareProducts(request);

      setResult(response);
    } catch (err: unknown) {
      console.error(
        "Price comparison failed:",
        err,
      );

      const backendMessage =
        err instanceof Error
          ? err.message
          : "";

      if (
        backendMessage &&
        (
          backendMessage.includes("supported") ||
          backendMessage.includes("valid") ||
          backendMessage.includes("URL")
        )
      ) {
        setError(backendMessage);
      } else {
        setError(
          "We couldn't compare these products right now. Please check the product URLs and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // WEBSITE NAME
  // ============================================================

  const getWebsiteName = (site: string) => {
    const normalizedSite = site
      .toLowerCase()
      .replace("_url", "");

    const website = websites.find(
      (item) =>
        item.key.replace("_url", "") ===
        normalizedSite,
    );

    return website?.name ?? site;
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">

        {/* ==================================================
            HEADER
        =================================================== */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Price Comparison
          </h1>

          <p className="mt-2 text-muted-foreground">
            Compare product prices across multiple Nepali
            shopping websites.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Supported websites: Daraz, Hamrobazaar,
            OnlineSathi, and MyChoice.
          </p>
        </div>

        {/* ==================================================
            WEBSITE SELECTION
        =================================================== */}

        <section
          className="
            rounded-2xl
            border
            border-border
            bg-card
            p-6
            text-card-foreground
            shadow-sm
          "
        >
          <h2 className="text-xl font-semibold text-foreground">
            Select websites
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Select at least two websites to compare
            prices.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {websites.map((website) => {
              const selected =
                selectedSites.includes(
                  website.key,
                );

              return (
                <button
                  key={website.key}
                  type="button"
                  onClick={() =>
                    toggleSite(website.key)
                  }
                  className={`
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    border
                    p-4
                    text-left
                    transition-colors
                    ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary hover:bg-primary/5"
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-5
                      w-5
                      items-center
                      justify-center
                      rounded-md
                      border
                      ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }
                    `}
                  >
                    {selected && (
                      <Check size={14} />
                    )}
                  </span>

                  <span className="font-medium text-foreground">
                    {website.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ==================================================
              URL INPUTS
          =================================================== */}

          {selectedSites.length > 0 && (
            <div className="mt-6 space-y-4">
              {selectedSites.map((site) => {
                const website = websites.find(
                  (item) => item.key === site,
                );

                if (!website) {
                  return null;
                }

                const fieldError =
                  fieldErrors[website.key];

                const currentUrl =
                  urls[website.key] ?? "";

                return (
                  <div key={website.key}>
                    <label
                      htmlFor={website.key}
                      className="mb-2 block text-sm font-medium text-foreground"
                    >
                      {website.name} Product URL
                    </label>

                    <input
                      id={website.key}
                      type="url"
                      value={currentUrl}
                      onChange={(event) =>
                        updateUrl(
                          website.key,
                          event.target.value,
                        )
                      }
                      placeholder={
                        website.placeholder
                      }
                      aria-invalid={Boolean(
                        fieldError,
                      )}
                      aria-describedby={
                        fieldError
                          ? `${website.key}-error`
                          : undefined
                      }
                      disabled={loading}
                      className={`
                        w-full
                        rounded-xl
                        border
                        bg-background
                        px-4
                        py-3
                        text-sm
                        text-foreground
                        outline-none
                        transition-colors
                        placeholder:text-muted-foreground
                        focus:ring-2
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        ${
                          fieldError
                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                            : "border-input focus:border-primary focus:ring-primary/20"
                        }
                      `}
                    />

                    {fieldError && (
                      <p
                        id={`${website.key}-error`}
                        className="mt-2 text-sm text-destructive"
                      >
                        {fieldError}
                      </p>
                    )}

                    {!fieldError &&
                      currentUrl.trim() &&
                      isValidSupportedUrl(
                        website.key,
                        currentUrl,
                      ) && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                          Valid {website.name} URL.
                        </p>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ==================================================
              ERROR
          =================================================== */}

          {error && (
            <div
              role="alert"
              className="
                mt-4
                rounded-xl
                border
                border-destructive/20
                bg-destructive/10
                px-4
                py-3
                text-sm
                text-destructive
              "
            >
              {error}
            </div>
          )}

          {/* ==================================================
              COMPARE BUTTON
          =================================================== */}

          <button
            type="button"
            onClick={handleCompare}
            disabled={
              loading ||
              selectedSites.length < 2 ||
              hasInvalidSelectedUrl
            }
            className="
              mt-6
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-primary
              px-6
              py-3
              font-semibold
              text-primary-foreground
              shadow-sm
              transition-colors
              hover:bg-primary/90
              focus:outline-none
              focus:ring-4
              focus:ring-primary/20
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Comparing prices...
              </>
            ) : (
              "Compare Prices"
            )}
          </button>
        </section>

        {/* ==================================================
            RESULTS
        =================================================== */}

        {result && (
          <section className="mt-8 space-y-6">

            {/* PRODUCT NAME */}

            {result.product && (
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {result.product}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Price comparison is based only on
                  products that match the reference product.
                </p>
              </div>
            )}

            {/* ==================================================
                CHEAPEST MATCHING PRODUCT
            =================================================== */}

            {result.cheapest && (
              <div
                className="
                  rounded-2xl
                  border
                  border-green-500/20
                  bg-green-500/10
                  p-6
                "
              >
                <div className="flex items-center gap-2">
                  <Trophy
                    size={22}
                    className="text-green-600 dark:text-green-400"
                  />

                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Cheapest Matching Price
                  </h3>
                </div>

                <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {getWebsiteName(
                        result.cheapest.site,
                      )}
                    </p>

                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                      Rs.{" "}
                      {result.cheapest.price?.toLocaleString() ??
                        "N/A"}
                    </p>
                  </div>

                  {result.cheapest.url && (
                    <a
                      href={result.cheapest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-lg
                        bg-green-600
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-white
                        transition-colors
                        hover:bg-green-700
                      "
                    >
                      View Product
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ==================================================
                AVAILABLE PRICES
            =================================================== */}

            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Available Products
              </h2>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {result.sites.map(
                  (site: CompareSiteResponse) => {
                    const isDifferentProduct =
                      site.status ===
                      "different_product";

                    const isMatchedProduct =
                      site.status === "matched";

                    const isCheapest =
                      isMatchedProduct &&
                      !isDifferentProduct &&
                      result.cheapest?.site ===
                        site.site;

                    const isHighest =
                      isMatchedProduct &&
                      !isDifferentProduct &&
                      result.highest?.site ===
                        site.site;

                    return (
                      <article
                        key={site.site}
                        className={`
                          overflow-hidden
                          rounded-2xl
                          border
                          bg-card
                          text-card-foreground
                          shadow-sm
                          ${
                            isDifferentProduct
                              ? "border-amber-500/30"
                              : isCheapest
                                ? "border-green-500/50 ring-2 ring-green-500/10"
                                : "border-border"
                          }
                        `}
                      >
                        {/* IMAGE */}

                        <div
                          className={`
                            flex
                            h-48
                            items-center
                            justify-center
                            border-b
                            border-border
                            p-5
                            ${
                              isDifferentProduct
                                ? "bg-amber-500/5"
                                : "bg-background"
                            }
                          `}
                        >
                          {site.image_url ? (
                            <img
                              src={site.image_url}
                              alt={
                                site.name ??
                                site.site
                              }
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No image available
                            </span>
                          )}
                        </div>

                        <div className="p-5">

                          {/* SITE + PRODUCT NAME */}

                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {getWebsiteName(
                                  site.site,
                                )}
                              </p>

                              <h3 className="mt-1 line-clamp-2 font-semibold text-foreground">
                                {site.name ??
                                  "Product unavailable"}
                              </h3>
                            </div>

                            {/* MATCHED PRODUCT BADGES */}

                            {isCheapest && (
                              <span
                                className="
                                  shrink-0
                                  rounded-full
                                  bg-green-500/10
                                  px-2
                                  py-1
                                  text-xs
                                  font-semibold
                                  text-green-700
                                  dark:text-green-400
                                "
                              >
                                Cheapest
                              </span>
                            )}
                          </div>

                          {/* ==================================================
                              DIFFERENT PRODUCT NOTICE
                          =================================================== */}

                          {isDifferentProduct && (
                            <div
                              className="
                                mt-4
                                rounded-xl
                                border
                                border-amber-500/20
                                bg-amber-500/10
                                px-3
                                py-3
                              "
                            >
                              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Different product
                              </p>

                              <p className="mt-1 text-xs leading-relaxed text-amber-700/80 dark:text-amber-400/80">
                                This product does not match
                                the reference product and is
                                excluded from the price
                                comparison.
                              </p>
                            </div>
                          )}

                          {/* ==================================================
                              PRICE
                          =================================================== */}

                          <p
                            className={`
                              mt-4
                              text-2xl
                              font-bold
                              ${
                                isDifferentProduct
                                  ? "text-muted-foreground"
                                  : "text-primary"
                              }
                            `}
                          >
                            {site.price !== null
                              ? `Rs. ${site.price.toLocaleString()}`
                              : "Unavailable"}
                          </p>

                          {/* ==================================================
                              HIGHEST PRICE
                          =================================================== */}

                          {isHighest &&
                            !isCheapest && (
                              <p className="mt-1 text-xs text-destructive">
                                Highest matching price
                              </p>
                            )}

                          {/* ==================================================
                              VIEW PRODUCT
                          =================================================== */}

                          {site.url && (
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                mt-4
                                flex
                                items-center
                                justify-center
                                gap-2
                                rounded-lg
                                px-4
                                py-2
                                text-sm
                                font-semibold
                                transition-colors
                                ${
                                  isDifferentProduct
                                    ? "bg-muted text-foreground hover:bg-muted/80"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }
                              `}
                            >
                              View Product
                              <ExternalLink
                                size={15}
                              />
                            </a>
                          )}

                          {/* ==================================================
                              STATUS
                          =================================================== */}

                          {!isDifferentProduct &&
                            site.status &&
                            site.status !== "matched" && (
                              <p className="mt-3 text-center text-xs text-muted-foreground">
                                Status:{" "}
                                {site.status}
                              </p>
                            )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </div>

            {/* ==================================================
                PRICE DIFFERENCE
            =================================================== */}

            {result.cheapest &&
              result.highest &&
              result.difference > 0 && (
                <div
                  className="
                    rounded-2xl
                    border
                    border-border
                    bg-card
                    p-6
                    text-center
                    text-card-foreground
                    shadow-sm
                  "
                >
                  <p className="text-sm text-muted-foreground">
                    Price difference between matching
                    products
                  </p>

                  <p className="mt-1 text-3xl font-bold text-foreground">
                    Rs.{" "}
                    {result.difference.toLocaleString()}
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Different products are excluded from
                    this calculation.
                  </p>
                </div>
              )}

            {/* ==================================================
                ONLY ONE MATCHING PRODUCT
            =================================================== */}

            {result.cheapest &&
              result.highest &&
              result.cheapest.site ===
                result.highest.site && (
                <div
                  className="
                    rounded-2xl
                    border
                    border-border
                    bg-card
                    p-5
                    text-center
                    text-card-foreground
                  "
                >
                  <p className="text-sm text-muted-foreground">
                    Only one matching product was found.
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Other products shown above were excluded
                    because they did not match the reference
                    product.
                  </p>
                </div>
              )}
          </section>
        )}

        {/* ==================================================
            EMPTY RESULT
        =================================================== */}

        {!result && !loading && (
          <div
            className="
              mt-8
              flex
              min-h-[250px]
              items-center
              justify-center
              rounded-2xl
              border
              border-dashed
              border-border
              bg-card
              text-card-foreground
            "
          >
            <div className="text-center">
              <X
                size={32}
                className="mx-auto text-muted-foreground"
              />

              <p className="mt-3 font-medium text-foreground">
                No comparison yet
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Select websites and enter product URLs
                to compare prices.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}