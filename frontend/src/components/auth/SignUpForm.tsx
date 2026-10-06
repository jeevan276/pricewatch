import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../../api/authApi";
import AuthField from "./AuthField";
import AuthFormLayout from "./AuthFormLayout";
import { getApiErrorMessage } from "../../utills/AuthError";
import { signUpSchema } from "../../utills/validationSchemas";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function SignUpForm() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setFieldErrors({});

    // Validate form data before making the API request.
    const validation = signUpSchema.safeParse({
      email,
      password,
      confirmPassword,
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

      await registerUser({
        email: email.trim(),
        password,
      });

      navigate("/signin");
    } catch (error: unknown) {
      setError(
        getApiErrorMessage(
          error,
          "Unable to create account. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout
      title="Create your account"
      description="Start tracking product prices with PriceWatch."
      onSubmit={handleSubmit}
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/signin"
            className="font-semibold text-primary transition hover:text-primary-hover"
          >
            Sign in
          </Link>
        </>
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
            id="signup-email"
            label="Email"
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(val) => {
  setEmail(val);

  const result = signUpSchema.shape.email.safeParse(val);

  setFieldErrors((prev) => ({
    ...prev,
    email: result.success
      ? undefined
      : result.error.issues[0]?.message,
  }));
}}
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
            id="signup-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            onChange={(val) => {
              setPassword(val);

              if (fieldErrors.password) {
                setFieldErrors((prev) => ({
                  ...prev,
                  password: undefined,
                }));
              }
            }}
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-[38px] rounded-lg p-2 text-body transition hover:text-primary"
            aria-label={
              showPassword ? "Hide password" : "Show password"
            }
            title={
              showPassword ? "Hide password" : "Show password"
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

        {/* Confirm Password */}
        <div className="relative">
          <AuthField
            id="signup-confirm-password"
            label="Confirm password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            placeholder="Repeat your password"
            autoComplete="new-password"
            onChange={(val) => {
              setConfirmPassword(val);

              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                }));
              }
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword((prev) => !prev)
            }
            className="absolute right-3 top-[38px] rounded-lg p-2 text-body transition hover:text-primary"
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
            title={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? (
              <EyeOff size={19} />
            ) : (
              <Eye size={19} />
            )}
          </button>

          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </div>
    </AuthFormLayout>
  );
}

