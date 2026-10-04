import { Link } from "react-router-dom";

export default function GuestHome() {
  return (
    <section className="mx-auto max-w-7xl  sm:px-6 lg:px-8">
      <div
        className="
          rounded-2xl
          border border-border
          bg-card
          p-8
          text-center
          shadow-sm
          transition-colors
          sm:p-12
        "
      >
        <h2
          className="
            text-2xl
            font-bold
            text-foreground
            sm:text-3xl
          "
        >
          Start tracking prices with PriceWatch
        </h2>

        <p
          className="
            mx-auto
            mt-3
            max-w-2xl
            text-muted-foreground
          "
        >
          Sign in to track products, monitor price changes, compare prices
          across stores, and find the best deals.
        </p>

        <div
          className="
            mt-6
            flex
            flex-col
            justify-center
            gap-3
            sm:flex-row
          "
        >
          <Link
            to="/signin"
            className="
              rounded-xl
              bg-primary
              px-6 py-3
              font-semibold
              text-primary-foreground
              transition
              hover:bg-primary/90
              hover:shadow-md
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary/50
            "
          >
            Sign in to start tracking
          </Link>

          <Link
            to="/signup"
            className="
              rounded-xl
              border border-border
              bg-background
              px-6 py-3
              font-semibold
              text-foreground
              transition
              hover:bg-accent
              hover:text-accent-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary/50
            "
          >
            Create account
          </Link>
        </div>
      </div>
    </section>
  );
}