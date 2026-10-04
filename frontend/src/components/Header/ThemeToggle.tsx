import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
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
      className="
        inline-flex h-9 w-9 items-center justify-center
        rounded-lg
        border border-slate-200
        bg-white
        text-slate-600
        transition
        hover:bg-slate-100
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-300
        dark:hover:bg-slate-800
      "
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}