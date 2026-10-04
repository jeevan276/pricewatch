import { LogOut, X } from "lucide-react";

import type { User } from "../../types/auth";

import NavigationLinks from "./NavigationLinks";
import UserAccount from "./UserAccount";
import AuthActions from "./AuthActions";

interface MobileMenuProps {
  user: User | null;
  isLoggedIn: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function MobileMenu({
  user,
  isLoggedIn,
  onClose,
  onLogout,
}: MobileMenuProps) {
  return (
    <div className="fixed inset-0 top-16 z-40 md:hidden">
  {/* Backdrop */}
  <button
    type="button"
    aria-label="Close navigation menu"
    onClick={onClose}
    className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
  />

  {/* Drawer */}
  <aside
    aria-label="Mobile navigation"
    className="
      absolute right-0 top-0
      h-[calc(100vh-4rem)]
      w-[min(22rem,90vw)]
      overflow-y-auto
      border-l border-border
      bg-background
      shadow-xl
    "
  >
    <div className="flex min-h-full flex-col p-4">
      {/* Drawer Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-sm font-semibold text-heading">
            Menu
          </p>

          <p className="text-xs text-body">
            PriceWatch
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="
            flex h-9 w-9
            items-center justify-center
            rounded-lg
            text-body
            transition-colors
            hover:bg-surface
            hover:text-primary
            focus:outline-none
            focus:ring-2
            focus:ring-primary/30
          "
        >
          <X
            size={20}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Navigation */}
      <NavigationLinks onNavigate={onClose} />

      {/* Account */}
      <div className="mt-auto border-t border-border pt-4">
        {isLoggedIn ? (
          <div className="space-y-3">
            <UserAccount
              user={user}
              compact
            />

            <button
              type="button"
              onClick={onLogout}
              className="
                flex w-full
                items-center justify-center gap-2
                rounded-xl
                bg-red-500/10
                px-4 py-3
                text-sm font-semibold
                text-red-500
                transition-colors
                hover:bg-red-500/20
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
          <AuthActions
            mobile
            onNavigate={onClose}
          />
        )}
      </div>
    </div>
  </aside>
</div>
  );
}