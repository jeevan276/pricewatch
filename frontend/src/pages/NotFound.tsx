import { Link } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <AlertTriangle className="h-10 w-10 text-primary" />
        </div>

        {/* 404 */}
        <h1 className="text-6xl font-bold text-foreground">
          404
        </h1>

        {/* Title */}
        <h2 className="mt-4 text-3xl font-bold text-foreground">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="mt-4 text-muted-foreground">
          Sorry, the page you're looking for doesn't exist or has
          been moved.
        </p>

        {/* Back Button */}
        <Link
          to="/"
          className="
            mt-8
            inline-flex
            items-center
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
          "
        >
          <Home size={18} />
          Back to Home
        </Link>
      </div>
    </main>
  );
}

