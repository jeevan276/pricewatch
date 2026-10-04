import { Link } from "react-router-dom";
import {
  Check,
  Clock3,
  TrendingDown,
  Users,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface text-heading transition-colors">
      {/* Background decoration */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
        {/* Hero content */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-heading shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            Smart Price Tracking
          </div>

          {/* Heading */}
          <h1 className="mt-8 text-5xl font-extrabold leading-[1.08] tracking-tight text-heading sm:text-6xl lg:text-7xl">
            Buy at the
            <span className="text-primary"> right price.</span>
            <br />
            Every time.
          </h1>

          {/* Description */}
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-body sm:text-xl">
            PriceWatch monitors your favorite products and lets you know when
            prices drop. Stop checking prices manually and start saving money.
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("product-form")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }}
              className="cursor-pointer rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Start Tracking
            </button>

            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-7 py-3.5 font-semibold text-heading transition hover:bg-surface"
            >
              Explore Products
            </Link>
          </div>

          {/* Trust */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-body">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-primary" />
              Free to use
            </div>

            <div className="flex items-center gap-2">
              <Check size={16} className="text-primary" />
              Automatic monitoring
            </div>

            <div className="flex items-center gap-2">
              <Check size={16} className="text-primary" />
              Price drop alerts
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-20 grid max-w-3xl grid-cols-1 divide-y divide-border rounded-2xl border border-border bg-secondary transition-colors sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center justify-center gap-3 p-5">
            <Clock3 size={22} className="text-primary" />

            <div>
              <p className="font-bold text-heading">24/7</p>
              <p className="text-xs text-body">Price monitoring</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 p-5">
            <TrendingDown size={22} className="text-primary" />

            <div>
              <p className="font-bold text-heading">Smart Alerts</p>
              <p className="text-xs text-body">Know when prices drop</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 p-5">
            <Users size={22} className="text-primary" />

            <div>
              <p className="font-bold text-heading">Multiple Stores</p>
              <p className="text-xs text-body">Track products in one place</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

