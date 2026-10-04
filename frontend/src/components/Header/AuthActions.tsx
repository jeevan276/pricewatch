import {
  LogIn,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";

interface AuthActionsProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function AuthActions({
  mobile = false,
  onNavigate,
}: AuthActionsProps) {
  if (mobile) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/signin"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-heading transition hover:bg-surface hover:text-primary"
        >
          <LogIn size={17} />
          Sign in
        </Link>

        <Link
          to="/signup"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-primary-hover"
        >
          <UserPlus size={17} />
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/signin"
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-heading transition hover:bg-surface hover:text-primary"
      >
        <LogIn size={17} />
        Sign in
      </Link>

      <Link
        to="/signup"
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-secondary shadow-sm transition hover:bg-primary-hover hover:shadow-md"
      >
        <UserPlus size={17} />
        Sign up
      </Link>
    </div>
  );
}