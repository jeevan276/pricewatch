import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "../../utills/validationSchemas";
import { warmBackend } from "../../lib/api";
import { loginUser } from "../../api/authApi";
import { setAuthData } from "../../utills/auth";
import { getApiErrorMessage } from "../../utills/AuthError";
import AuthField from "./AuthField";
import AuthFormLayout from "./AuthFormLayout";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { void warmBackend(); }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setFieldErrors({});

    // Validate form data before making the API request.
    const validation = loginSchema.safeParse({
      email,
      password,
    });

    if (!validation.success) {
      const errors: FieldErrors = {};

      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;

        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });

      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser({
        email: email.trim(),
        password,
      });

      setAuthData(response.access_token, response.user);

      const target = location.state?.from;
      navigate(typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : "/products", { replace: true });
    } catch (error: unknown) {
      setError(
        getApiErrorMessage(
          error,
          "Invalid email or password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      description="Sign in to continue tracking your products."
      onSubmit={handleSubmit}
      footer={
        <p className="text-center text-sm text-body">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-primary transition hover:text-primary-hover"
          >
            Create an account
          </Link>
        </p>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Email */}
        <div>
          <AuthField
            id="signin-email"
            label="Email"
            type="email"
            value={email}
            onChange={(val) => {
              setEmail(val);

              if (fieldErrors.email) {
                setFieldErrors((prev) => ({
                  ...prev,
                  email: undefined,
                }));
              }
            }}
            placeholder="you@example.com"
            autoComplete="email"
          />

          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="relative">
          <AuthField
            id="signin-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(val) => {
              setPassword(val);

              if (fieldErrors.password) {
                setFieldErrors((prev) => ({
                  ...prev,
                  password: undefined,
                }));
              }
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-[38px] rounded-lg p-2 text-body transition hover:text-primary"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            title={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff size={19} />
            ) : (
              <Eye size={19} />
            )}
          </button>

          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </AuthFormLayout>
  );
}

