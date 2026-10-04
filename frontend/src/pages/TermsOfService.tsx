import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <ArrowLeft size={17} />
            Back to PriceWatch
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Last updated: August 31, 2026
          </p>

          <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-300">
            These Terms of Service govern your use of the PriceWatch platform.
            By accessing or using PriceWatch, you agree to comply with these
            terms.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              1. About PriceWatch
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              PriceWatch is a price monitoring platform that helps users track
              products, monitor price changes, view price history, and compare
              product information from supported online stores.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              2. Product and Price Information
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Prices and product information displayed by PriceWatch may change
              at any time. Information is collected from supported online
              stores and may occasionally be delayed, unavailable, or
              inaccurate.
            </p>

            <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:border dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />

              <p>
                Always verify the final product price, availability, shipping
                cost, and other purchase details on the retailer's website
                before completing a purchase.
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              3. Product Tracking
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Users can submit supported product URLs for monitoring.
              PriceWatch may periodically check those products and record
              changes in their prices.
            </p>

            <ul className="mt-4 space-y-2 text-slate-600 dark:text-slate-300">
              {[
                "A product may become unavailable.",
                "A retailer may change its website structure.",
                "A submitted URL may become invalid.",
                "Automated access may temporarily fail.",
                "A retailer may remove a product.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              4. Third-Party Retailers
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              PriceWatch is not responsible for third-party retailers,
              products, transactions, delivery, returns, warranties, or
              retailer policies. Purchases are made directly between users and
              the applicable retailer.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              5. Acceptable Use
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              You agree not to misuse PriceWatch, attempt to interfere with its
              operation, abuse API endpoints, submit malicious content, or use
              the service for unlawful activities.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              6. Service Availability
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              We aim to keep PriceWatch reliable and available, but we do not
              guarantee uninterrupted service. Features may be changed,
              temporarily unavailable, or discontinued.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              7. Limitation of Liability
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              PriceWatch is provided on an "as is" and "as available" basis.
              We are not responsible for losses caused by inaccurate product
              information, price changes, unavailable products, retailer
              changes, or third-party services.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              8. Changes to These Terms
            </h2>

            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              These Terms of Service may be updated as PriceWatch evolves.
              Continued use of the platform after an update constitutes
              acceptance of the revised terms.
            </p>
          </article>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Need clarification?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            If you have questions regarding these terms, our support team can
            help.
          </p>

          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Contact Support
            <ExternalLink size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}