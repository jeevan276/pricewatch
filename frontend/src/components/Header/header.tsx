import { useState } from "react";
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";

import Logo from "./Logo";
import AuthActions from "./AuthActions";
import UserAccount from "./UserAccount";
import MobileMenu from "./MobileMenu";
import NotificationBell from "../notifications/NotificationBell";

import { useTheme } from "../../hooks/useTheme";

import type { User } from "../../types/auth";

interface HeaderProps {
  user: User | null;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      className="
        flex h-10 w-10
        items-center justify-center
        rounded-xl
        border border-border
        bg-secondary
        text-heading
        transition-colors
        hover:bg-surface
        hover:text-primary
        focus:outline-none
        focus:ring-2
        focus:ring-primary/30
      "
    >
      {isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
};

const Header = ({
  user,
  isLoggedIn,
  onLogout,
}: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((current) => !current);
  };

  const handleLogout = () => {
    closeMobileMenu();
    onLogout();
  };

  return (
    <header
      className="
        sticky top-0 z-50 w-full
        border-b border-border
        bg-background/95
        shadow-sm
        backdrop-blur
      "
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo onClick={closeMobileMenu} />

        {/* ====================================================
            DESKTOP NAVIGATION
        ==================================================== */}

        <div className="hidden items-center md:flex">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <ThemeToggle />

              <NotificationBell key={user?.id} />

              <UserAccount user={user} />

              <button
                type="button"
                onClick={handleLogout}
                className="
                  flex items-center gap-2
                  rounded-xl
                  px-4 py-2
                  text-sm font-semibold
                  text-body
                  transition-colors
                  hover:bg-red-500/10
                  hover:text-red-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-red-500/30
                "
              >
                <LogOut
                  size={17}
                  aria-hidden="true"
                />

                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ThemeToggle />

              <AuthActions />
            </div>
          )}
        </div>

        {/* ====================================================
            MOBILE NAVIGATION
        ==================================================== */}

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />

          <button
            type="button"
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={toggleMobileMenu}
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-xl
              text-heading
              transition-colors
              hover:bg-surface
              hover:text-primary
              focus:outline-none
              focus:ring-2
              focus:ring-primary/30
            "
          >
            {mobileMenuOpen ? (
              <X
                size={23}
                aria-hidden="true"
              />
            ) : (
              <Menu
                size={23}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {/* ======================================================
          MOBILE MENU
      ====================================================== */}

      {mobileMenuOpen && (
        <div id="mobile-navigation">
          <MobileMenu
            user={user}
            isLoggedIn={isLoggedIn}
            onClose={closeMobileMenu}
            onLogout={handleLogout}
          />
        </div>
      )}
    </header>
  );
};

export default Header;