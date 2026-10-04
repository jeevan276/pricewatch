import {
  GitCompareArrows,
  Home,
  Package,
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface NavigationLinksProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  {
    name: "Home",
    path: "/",
    icon: Home,
  },
  {
    name: "Products",
    path: "/products",
    icon: Package,
  },
  {
    name: "Compare",
    path: "/compare",
    icon: GitCompareArrows,
  },
] as const;

export default function NavigationLinks({
  collapsed = false,
  onNavigate,
}: NavigationLinksProps) {
  return (
    <nav aria-label="Primary navigation">
      {/* Section title */}
      {!collapsed && (
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Dashboard
        </p>
      )}

      {/* Navigation items */}
      <ul className="space-y-1.5">
        {NAV_ITEMS.map(
          ({ name, path, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                onClick={onNavigate}
                title={
                  collapsed
                    ? name
                    : undefined
                }
                className={({ isActive }) =>
                  [
                    // Base
                    "group flex items-center rounded-xl",
                    "text-sm font-medium",
                    "transition-all duration-200",

                    // Accessibility
                    "focus-visible:outline-none",
                    "focus-visible:ring-2",
                    "focus-visible:ring-primary",
                    "focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-background",

                    // Layout
                    collapsed
                      ? "justify-center px-3 py-3"
                      : "gap-3 px-3 py-3",

                    // Active / inactive
                    isActive
                      ? [
                          "bg-primary/10",
                          "font-semibold",
                          "text-primary",
                        ].join(" ")
                      : [
                          "text-muted-foreground",
                          "hover:bg-accent",
                          "hover:text-accent-foreground",
                        ].join(" "),
                  ].join(" ")
                }
              >
                <Icon
                  size={19}
                  strokeWidth={2}
                  className={[
                    "shrink-0",
                    "transition-colors duration-200",
                  ].join(" ")}
                />

                {!collapsed && (
                  <span className="truncate">
                    {name}
                  </span>
                )}
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}