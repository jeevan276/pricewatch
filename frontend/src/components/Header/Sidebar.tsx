import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

import type { User } from "../../types/auth";

import NavigationLinks from "./NavigationLinks";
import UserAccount from "./UserAccount";

interface SidebarProps {
  user: User | null;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  user,
  collapsed,
  onToggle,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      aria-label="Dashboard navigation"
      className={[
        "fixed left-0 top-16 z-40 hidden",
        "h-[calc(100vh-4rem)]",
        "md:block",
        "border-r border-border",
        "bg-background",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      <div className="flex h-full flex-col overflow-hidden p-3 lg:p-4">
        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavigationLinks collapsed={collapsed} />
        </div>

        {/* Account + Logout */}
        <div className="mt-4 shrink-0 border-t border-border pt-4">
          {!collapsed && (
            <div className="mb-3">
              <UserAccount
                user={user}
                compact
              />
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={[
              "flex w-full items-center rounded-xl",
              "text-sm font-semibold",
              "text-muted-foreground",
              "transition-colors duration-200",
              "hover:bg-destructive/10",
              "hover:text-destructive",
              "focus-visible:outline-none",
              "focus-visible:ring-2",
              "focus-visible:ring-destructive/50",
              collapsed
                ? "justify-center px-3 py-3"
                : "gap-3 px-3 py-3",
            ].join(" ")}
          >
            <LogOut
              size={19}
              strokeWidth={2}
              className="shrink-0"
            />

            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Button */}
        <button
          type="button"
          onClick={onToggle}
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          className={[
            "mt-3 flex w-full shrink-0",
            "items-center justify-center",
            "rounded-xl border border-border",
            "bg-card",
            "py-2.5",
            "text-muted-foreground",
            "transition-colors duration-200",
            "hover:bg-accent",
            "hover:text-accent-foreground",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-primary/50",
          ].join(" ")}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>
    </aside>
  );
}