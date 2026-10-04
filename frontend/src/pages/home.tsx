import Hero from "../components/Hero/hero";
import { useAuth } from "../hooks/useAuth";
import { useProducts } from "../hooks/useProducts";
import LoggedInHome from "../components/home/LoggedInHome";
import GuestHome from "../components/home/GuestHome";

export default function Home() {
  const { isLoggedIn } = useAuth();

  const {
    products,
    addProduct,
    removeProduct,
    loading,
    error,
  } = useProducts(isLoggedIn);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      {/* Grid */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          bg-[linear-gradient(to_right,hsl(var(--border)/0.28)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.28)_1px,transparent_1px)]
          bg-[size:32px_32px]
        "
      />

      {/* Soft white/transparent fade over grid */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background)/0.35)_55%,hsl(var(--background)/0.9)_100%)]
        "
      />

      {/* Top center glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          z-0
          h-[420px]
          w-[700px]
          -translate-x-1/2
          rounded-full
          bg-primary/5
          blur-3xl
        "
      />

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10">
        {/* Hero */}
        <Hero />

        {/* Space between Hero and Home content */}
        <div className="pt-8 mb-8">
          {isLoggedIn ? (
            <LoggedInHome
              products={products}
              addProduct={addProduct}
              removeProduct={removeProduct}
              loading={loading}
              error={error}
            />
          ) : (
            <GuestHome />
          )}
        </div>
      </div>
    </main>
  );
}