import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const location = useLocation();

  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}