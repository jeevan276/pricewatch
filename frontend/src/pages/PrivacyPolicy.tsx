import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    icon: Database,
    title: "Information We Collect",
    content:
      "PriceWatch may collect information required to provide product tracking and account functionality. This can include your name, email address, product URLs, tracked products, and information related to your use of the platform.",
  },
  {
    icon: Eye,
    title: "Product Information",
    content:
      "When you submit a supported product URL, PriceWatch retrieves publicly available product information such as product name, current price, product image, and availability. This information is used to provide price tracking and comparison features.",
  },
  {
    icon: ShieldCheck,
    title: "How We Use Your Information",
    content:
      "We use collected information to provide price tracking, maintain price history, monitor products, improve the platform, troubleshoot issues, and communicate with users when necessary.",
  },
  {
    icon: Lock,
    title: "Data Security",
    content:
      "We take reasonable technical and organizational measures to protect information stored by PriceWatch. However, no internet-based service can guarantee complete security of information.",
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ======================================================
          PAGE HEADER
      ======================================================= */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
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

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: August 31, 2026
          </p>

          <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">
            PriceWatch is designed to help users monitor product prices and
            make better purchasing decisions. This Privacy Policy explains
            what information we collect, how we use it, and how we protect it.
          </p>
        </div>
      </section>

      {/* ======================================================
          CONTENT
      ======================================================= */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-5">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.title}
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
                <div className="flex gap-4">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-primary/10
                      text-primary
                    "
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {section.title}
                    </h2>

                    <p className="mt-2 leading-7 text-muted-foreground">
                      {section.content}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Third-Party Websites */}
          <article
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
            <h2 className="text-lg font-semibold text-foreground">
              Third-Party Websites
            </h2>

            <p className="mt-3 leading-7 text-muted-foreground">
              PriceWatch may retrieve or display information from third-party
              shopping websites. These websites have their own privacy
              policies and terms. PriceWatch does not control the privacy
              practices of external websites.
            </p>
          </article>

          {/* Cookies and Local Storage */}
          <article
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
            <h2 className="text-lg font-semibold text-foreground">
              Cookies and Local Storage
            </h2>

            <p className="mt-3 leading-7 text-muted-foreground">
              PriceWatch may use browser storage or similar technologies to
              maintain authentication state, application preferences, and
              other functionality necessary for the platform.
            </p>
          </article>

          {/* Changes to This Policy */}
          <article
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
            <h2 className="text-lg font-semibold text-foreground">
              Changes to This Policy
            </h2>

            <p className="mt-3 leading-7 text-muted-foreground">
              We may update this Privacy Policy as PriceWatch evolves. Any
              changes will be reflected on this page together with an updated
              revision date.
            </p>
          </article>
        </div>

        {/* ======================================================
            CONTACT CTA
        ======================================================= */}
        <div
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
          <div className="flex items-start gap-4">
            <CheckCircle2
              className="mt-1 shrink-0 text-primary"
              size={22}
            />

            <div>
              <h2 className="font-semibold text-foreground">
                Questions about privacy?
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                If you have questions about how PriceWatch handles your
                information, contact our support team.
              </p>

              <Link
                to="/contact"
                className="
                  mt-4
                  inline-flex
                  items-center
                  rounded-lg
                  bg-primary
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-primary-foreground
                  transition-colors
                  hover:bg-primary/90
                  focus:outline-none
                  focus:ring-4
                  focus:ring-primary/20
                "
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

