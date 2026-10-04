import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  ExternalLink,
  History,
  PackageSearch,
  Server,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: PackageSearch,
    title: "Product Tracking",
    description:
      "Add supported product URLs and retrieve product information and current prices.",
  },
  {
    icon: History,
    title: "Price History",
    description:
      "Work with recorded price changes to understand how product prices move over time.",
  },
  {
    icon: Code2,
    title: "Developer Friendly",
    description:
      "Explore and test API endpoints through the interactive FastAPI documentation.",
  },
  {
    icon: Zap,
    title: "Automated Monitoring",
    description:
      "PriceWatch periodically checks tracked products and records price changes.",
  },
];

const exampleResponse = `{
  "name": "Example Product",
  "price": 1999,
  "image_url": "https://example.com/product.jpg"
}`;

export default function ApiDocumentation() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="
              mb-8
              inline-flex
              items-center
              gap-2
              text-sm
              font-medium
              text-muted-foreground
              transition-colors
              hover:text-primary
            "
          >
            <ArrowLeft size={17} />
            Back to PriceWatch
          </Link>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div
                className="
                  mb-5
                  inline-flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary/10
                  text-primary
                "
              >
                <Server size={25} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                PriceWatch API
              </h1>

              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Access PriceWatch functionality programmatically and explore
                product, price, tracking, and history data through our API.
              </p>
            </div>

            <a
              href="https://price-watch-n3nz.onrender.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-primary
                px-5
                py-3
                text-sm
                font-semibold
                text-primary-foreground
                shadow-sm
                transition-colors
                hover:bg-primary/90
              "
            >
              Open Swagger Docs
              <ExternalLink size={17} />
            </a>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTENT
      ====================================================== */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Base URL */}
        <div
          className="
            mb-10
            rounded-2xl
            border
            border-border
            bg-card
            p-6
            text-card-foreground
            shadow-sm
          "
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Base URL
          </p>

          <code
            className="
              mt-3
              block
              overflow-x-auto
              rounded-xl
              bg-slate-950
              px-4
              py-4
              text-sm
              text-slate-200
            "
          >
            https://price-watch-n3nz.onrender.com
          </code>
        </div>

        {/* Features */}
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  p-6
                  text-card-foreground
                  shadow-sm
                  transition-colors
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary/10
                    text-primary
                  "
                >
                  <Icon size={20} />
                </div>

                <h2 className="mt-4 font-semibold text-foreground">
                  {feature.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        {/* Interactive API Documentation */}
        <section
          className="
            mt-10
            rounded-2xl
            border
            border-border
            bg-card
            p-6
            text-card-foreground
            shadow-sm
          "
        >
          <div className="flex items-center gap-3">
            <Code2 className="text-primary" size={21} />

            <h2 className="text-xl font-semibold text-foreground">
              Interactive API Documentation
            </h2>
          </div>

          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            PriceWatch uses FastAPI, so the deployed backend provides an
            interactive Swagger interface where you can inspect available
            endpoints, parameters, responses, and test requests.
          </p>

          <a
            href="https://price-watch-n3nz.onrender.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-5
              inline-flex
              items-center
              gap-2
              rounded-lg
              border
              border-border
              bg-background
              px-4
              py-2.5
              text-sm
              font-semibold
              text-foreground
              transition-colors
              hover:border-primary/30
              hover:bg-primary/10
              hover:text-primary
            "
          >
            View Interactive Documentation
            <ExternalLink size={16} />
          </a>
        </section>

        {/* Product Data */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-foreground">
            Product Data
          </h2>

          <p className="mt-2 text-muted-foreground">
            Product-related API responses can contain information such as the
            product name, current price, and product image.
          </p>

          <div
            className="
              mt-5
              overflow-hidden
              rounded-2xl
              border
              border-slate-800
              bg-slate-950
              shadow-sm
            "
          >
            <div className="border-b border-slate-800 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Example Response
              </span>
            </div>

            <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-200">
              <code>{exampleResponse}</code>
            </pre>
          </div>
        </section>

        {/* API Guidelines */}
        <section className="mt-10 rounded-2xl bg-slate-900 p-7 text-white">
          <h2 className="text-xl font-semibold">
            API usage guidelines
          </h2>

          <ul className="mt-5 space-y-3">
            {[
              "Use reasonable request rates.",
              "Do not attempt to disrupt the PriceWatch service.",
              "Validate API responses before using product data.",
              "Always verify important product and price information with the retailer.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                />

                {item}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
