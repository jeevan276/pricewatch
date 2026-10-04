import { useRef, useState } from "react";
import type { FormEvent } from "react";

import type { Product } from "../../types/product";
import { useAuth } from "../../hooks/useAuth";

interface Props {
  product: Product;
  busy: boolean;
  onSave: (target: number | null) => Promise<void>;
}

export default function PriceThreshold({
  product,
  busy,
  onSave,
}: Props) {
  const { user } = useAuth();

  const [value, setValue] = useState(
    product.target_price == null ? "" : String(product.target_price)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = useRef(false);

  const save = async (target: number | null) => {
    if (busy || pending.current) return;

    pending.current = true;
    setError(null);
    setMessage(null);

    try {
      await onSave(target);

      setValue(target === null ? "" : String(target));

      setMessage(
        target === null
          ? "Price alert removed."
          : "Target saved. The next successful price check will evaluate it."
      );
    } catch {
      setError("Could not save your target price. Please try again.");
    } finally {
      pending.current = false;
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const target = Number(value);

    const isInvalid =
      !value.trim() ||
      !Number.isFinite(target) ||
      target < 0.01 ||
      target > 10_000_000 ||
      Math.round(target * 100) / 100 !== target;

    if (isInvalid) {
      setError(
        "Enter a price from Rs. 0.01 to Rs. 10,000,000, with at most two decimal places."
      );
      return;
    }

    void save(target);
  };

  const savedTarget =
    product.target_price != null
      ? product.target_price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-labelledby="price-alert-title"
    >
      {/* Header */}
      <div>
        <h2
          id="price-alert-title"
          className="text-xl font-semibold text-foreground"
        >
          Target Price Email Alert
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Email{" "}
          {user?.email ? (
            <strong className="text-foreground">{user.email}</strong>
          ) : (
            "your signed-in email address"
          )}{" "}
          when the verified price reaches or falls below your target and the
          product is available.
        </p>
      </div>

      {/* Saved Target */}
      <p className="mt-3 text-sm text-foreground">
        {savedTarget ? (
          <>
            Saved target: <strong>Rs. {savedTarget}</strong>
          </>
        ) : (
          "No target price set."
        )}
      </p>

      {/* Threshold Status */}
      {product.target_price != null && product.threshold_reached && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Your target was reached and an email alert was queued. A new alert
          can trigger after the price rises above your target and drops again.
        </p>
      )}

      {/* Email Availability */}
      {product.email_alerts_available === false && (
        <p
          role="status"
          className="mt-2 text-sm text-amber-600 dark:text-amber-400"
        >
          Email alerts are temporarily unavailable. Your target will still be
          saved.
        </p>
      )}

      {/* Form */}
      <form
        onSubmit={submit}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="target-price"
            className="text-sm font-medium text-foreground"
          >
            Target Price (Rs.)
          </label>

          <input
            id="target-price"
            type="number"
            inputMode="decimal"
            min="0.01"
            max="10000000"
            step="0.01"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
              setMessage(null);
            }}
            disabled={busy}
            aria-describedby="target-price-help"
            placeholder="e.g. 2500"
            className="w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Please wait…" : "Save Target"}
        </button>

        {/* Remove Button */}
        {product.target_price != null && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(null)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove Alert
          </button>
        )}
      </form>

      {/* Help Text */}
      <p
        id="target-price-help"
        className="mt-3 text-xs text-muted-foreground"
      >
        One email per threshold crossing. Checks run every five minutes while
        monitoring is active. You can also use “Check now”.
      </p>

      {/* Success Message */}
      {message && (
        <p
          role="status"
          className="mt-3 text-sm text-green-600 dark:text-green-400"
        >
          {message}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </section>
  );
}

