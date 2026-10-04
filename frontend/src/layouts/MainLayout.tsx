import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Header from "../components/Header/header";
import Footer from "../components/Footer/footer";
import Sidebar from "../components/Header/Sidebar";

import { useAuth } from "../hooks/useAuth";
import { clearAuth } from "../utills/auth";
import ScrollToTop from "../components/common/ScrollToTop";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);



  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <div
      className="
        min-h-screen
        bg-background
        text-foreground
        transition-colors
        duration-200
      "
    >
      <ScrollToTop />
      {/* =====================================================
          HEADER
      ====================================================== */}
      <Header
        user={user}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}
      {isLoggedIn && (
        <Sidebar
          user={user}
          collapsed={sidebarCollapsed}
          onToggle={() =>
            setSidebarCollapsed((current) => !current)
          }
          onLogout={handleLogout}
        />
      )}

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}
      <div
        className={[
          "min-h-screen",
          "transition-[padding] duration-300",
          isLoggedIn
            ? sidebarCollapsed
              ? "md:pl-20"
              : "md:pl-64"
            : "",
        ].join(" ")}
      >
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet key={`${user?.id ?? "guest"}:${location.pathname}`} />
        </main>

        <Footer />
      </div>
    </div>
  );
}