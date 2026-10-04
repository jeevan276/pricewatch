    import { User } from "lucide-react";

    import type { User as AuthUser } from "../../types/auth";

    interface UserAccountProps {
      user: AuthUser | null;
      compact?: boolean;
    }

    export default function UserAccount({
      user,
      compact = false,
    }: UserAccountProps) {
      return (
        <div
  className={[
    "flex items-center gap-3 rounded-xl",
    compact
      ? "bg-muted p-3"
      : "border border-border bg-muted px-3 py-2",
  ].join(" ")}
>
  <div
    className={[
      "flex shrink-0 items-center justify-center rounded-full",
      "bg-primary/10 text-primary",
      compact
        ? "h-10 w-10"
        : "h-8 w-8",
    ].join(" ")}
  >
    <User size={compact ? 18 : 17} />
  </div>

  <div className="min-w-0">
    {compact && (
      <p className="text-xs text-muted-foreground">
        Signed in as
      </p>
    )}

    <p
      className={[
        "truncate text-sm font-semibold",
        compact
          ? "text-heading"
          : "text-foreground",
      ].join(" ")}
    >
      {user?.email ?? "User"}
    </p>

    {!compact && (
      <p className="text-xs text-muted-foreground">
        PriceWatch account
      </p>
    )}
  </div>
</div>
      );
    }