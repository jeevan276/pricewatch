import { z } from "zod";

// ============================================================
// SIGN UP
// ============================================================

export const signUpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, {
        message: "Email address is required.",
      })
      .max(320, {
        message: "Email address is too long.",
      })
      .email({
        message: "Please enter a valid email address.",
      }),

    password: z
      .string()
      .min(8, {
        message: "Password must be at least 8 characters.",
      })
      .max(128, {
        message: "Password must be 128 characters or fewer.",
      })
      .refine((value) => new TextEncoder().encode(value).length <= 72, {
        message: "Password must be 72 UTF-8 bytes or fewer.",
      })
      .refine((value) => !/\s/.test(value), {
        message: "Password cannot contain whitespace.",
      })
      .refine((value) => /[A-Z]/.test(value), {
        message: "Password must contain at least one uppercase letter.",
      })
      .refine((value) => /[a-z]/.test(value), {
        message: "Password must contain at least one lowercase letter.",
      })
      .refine((value) => /\d/.test(value), {
        message: "Password must contain at least one number.",
      })
      .refine((value) => /[^A-Za-z0-9]/.test(value), {
        message: "Password must contain at least one special character.",
      }),

    confirmPassword: z
      .string()
      .min(1, {
        message: "Please confirm your password.",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;


// ============================================================
// SIGN IN
// ============================================================

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, {
      message: "Email address is required.",
    })
    .max(320, {
      message: "Email address is too long.",
    })
    .email({
      message: "Please enter a valid email address.",
    }),

  password: z
    .string()
    .min(1, {
      message: "Password is required.",
    })
    .max(128, {
      message: "Password must be 128 characters or fewer.",
    }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

