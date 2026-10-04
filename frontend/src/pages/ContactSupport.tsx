import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const INITIAL_FORM: ContactFormData = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const API_URL =
  "https://price-watch-n3nz.onrender.com/api/contact";

// ============================================================
// VALIDATION LIMITS
// ============================================================

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

const SUBJECT_MIN_LENGTH = 3;
const SUBJECT_MAX_LENGTH = 200;

const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 5000;

// ============================================================
// VALIDATION HELPERS
// ============================================================

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NAME_REGEX =
  /^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u;

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validateName(name: string): string | undefined {
  const value = normalizeSpaces(name);

  if (!value) {
    return "Please enter your name.";
  }

  if (value.length < NAME_MIN_LENGTH) {
    return "Your name must be at least 2 characters.";
  }

  if (value.length > NAME_MAX_LENGTH) {
    return "Your name must be 100 characters or fewer.";
  }

  if (!NAME_REGEX.test(value)) {
    return "Please enter a valid name using letters, spaces, hyphens, or apostrophes.";
  }

  return undefined;
}

function validateEmail(email: string): string | undefined {
  const value = email.trim();

  if (!value) {
    return "Please enter your email address.";
  }

  if (value.length > 254) {
    return "Please enter a valid email address.";
  }

  if (!EMAIL_REGEX.test(value)) {
    return "Please enter a valid email address, such as you@example.com.";
  }

  return undefined;
}

function validateSubject(
  subject: string,
): string | undefined {
  const value = normalizeSpaces(subject);

  if (!value) {
    return "Please enter a subject.";
  }

  if (value.length < SUBJECT_MIN_LENGTH) {
    return "Your subject must be at least 3 characters.";
  }

  if (value.length > SUBJECT_MAX_LENGTH) {
    return "Your subject must be 200 characters or fewer.";
  }

  return undefined;
}

function validateMessage(
  message: string,
): string | undefined {
  const value = message.trim();

  if (!value) {
    return "Please tell us how we can help.";
  }

  if (value.length < MESSAGE_MIN_LENGTH) {
    return "Please provide a little more detail (at least 10 characters).";
  }

  if (value.length > MESSAGE_MAX_LENGTH) {
    return "Your message must be 5000 characters or fewer.";
  }

  return undefined;
}

function validateForm(
  form: ContactFormData,
): FormErrors {
  const errors: FormErrors = {};

  const nameError = validateName(form.name);
  const emailError = validateEmail(form.email);
  const subjectError = validateSubject(form.subject);
  const messageError = validateMessage(form.message);

  if (nameError) {
    errors.name = nameError;
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (subjectError) {
    errors.subject = subjectError;
  }

  if (messageError) {
    errors.message = messageError;
  }

  return errors;
}

// ============================================================
// API ERROR HELPER
// ============================================================

function getApiErrorMessage(
  data: unknown,
): string {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data
  ) {
    const detail = (
      data as { detail?: unknown }
    ).detail;

    // FastAPI validation errors
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (
            item &&
            typeof item === "object" &&
            "msg" in item
          ) {
            return String(
              (item as { msg?: unknown }).msg,
            );
          }

          return null;
        })
        .filter(Boolean)
        .join(" ");
    }

    if (typeof detail === "string") {
      return detail;
    }
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data
  ) {
    const message = (
      data as { message?: unknown }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "We couldn't send your message right now. Please check your information and try again.";
}

// ============================================================
// COMPONENT
// ============================================================

export default function ContactSupport() {
  const [form, setForm] =
    useState<ContactFormData>(INITIAL_FORM);

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================
  // HANDLE FIELD CHANGE
  // ==========================================================

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    // Clear only the error for the field being edited.
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: undefined,
    }));

    if (error) {
      setError(null);
    }

    if (success) {
      setSuccess(false);
    }
  };

  // ==========================================================
  // VALIDATE INDIVIDUAL FIELD
  // ==========================================================

  const handleBlur = (
    event: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name } = event.target;

    let fieldError: string | undefined;

    switch (name) {
      case "name":
        fieldError = validateName(form.name);
        break;

      case "email":
        fieldError = validateEmail(form.email);
        break;

      case "subject":
        fieldError = validateSubject(form.subject);
        break;

      case "message":
        fieldError = validateMessage(form.message);
        break;

      default:
        break;
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: fieldError,
    }));
  };

  // ==========================================================
  // HANDLE SUBMIT
  // ==========================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);
    setSuccess(false);

    // Validate everything before sending.
    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Focus the first invalid field.
      const firstInvalidField =
        Object.keys(validationErrors)[0];

      requestAnimationFrame(() => {
        document
          .getElementById(firstInvalidField)
          ?.focus();
      });

      return;
    }

    setErrors({});
    setLoading(true);

    // Normalize values before sending them to backend.
    const payload = {
      name: normalizeSpaces(form.name),
      email: form.email.trim().toLowerCase(),
      subject: normalizeSpaces(form.subject),
      message: form.message.trim(),
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(data),
        );
      }

      setSuccess(true);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (err: unknown) {
      console.error("Contact form error:", err);

      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't send your message right now. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ======================================================
          PAGE HEADER
      ======================================================= */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <Link
            to="/"
            className="
              mb-7
              inline-flex
              items-center
              gap-2
              text-sm
              font-medium
              text-muted-foreground
              transition-colors
              hover:text-primary
            "
          >
            <ArrowLeft size={17} />
            Back to PriceWatch
          </Link>

          <div className="max-w-3xl">
            <div
              className="
                mb-4
                inline-flex
                items-center
                gap-2
                rounded-full
                bg-primary/10
                px-3
                py-1.5
                text-sm
                font-medium
                text-primary
              "
            >
              <Mail size={15} />
              Support
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Contact Support
            </h1>

            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Have a question, found a tracking issue, or have
              an idea for PriceWatch? Send us a message and we'll
              get back to you.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================
          CONTENT
      ======================================================= */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          {/* ==================================================
              SUPPORT INFORMATION
          =================================================== */}
          <aside>
            <div
              className="
                rounded-2xl
                border
                border-border
                bg-card
                p-6
                text-card-foreground
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <Mail size={21} />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-foreground">
                How can we help?
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tell us what you're experiencing and include
                relevant details so we can help you faster.
              </p>

              <div className="mt-7 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Product tracking issue
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Include the product URL and explain what
                    happened.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Price information issue
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Tell us if the displayed price is incorrect
                    or outdated.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Feature request
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    We'd love to hear ideas that could make
                    PriceWatch better.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    General question
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Have a question about PriceWatch? Send it our
                    way.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ==================================================
              CONTACT FORM
          =================================================== */}
          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-6
              text-card-foreground
              shadow-sm
              sm:p-8
            "
          >
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-foreground">
                Send us a message
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Fill out the form below and our support team will
                receive your message.
              </p>
            </div>

            {/* ==================================================
                SUCCESS MESSAGE
            =================================================== */}
            {success && (
              <div
                role="status"
                aria-live="polite"
                className="
                  mb-6
                  flex
                  gap-3
                  rounded-xl
                  border
                  border-green-500/20
                  bg-green-500/10
                  p-4
                  text-sm
                  text-green-700
                  dark:text-green-400
                "
              >
                <CheckCircle2
                  className="mt-0.5 shrink-0"
                  size={19}
                />

                <div>
                  <p className="font-semibold">
                    Message sent successfully!
                  </p>

                  <p className="mt-1 leading-6">
                    Thanks for contacting PriceWatch. We'll get
                    back to you as soon as possible.
                  </p>
                </div>
              </div>
            )}

            {/* ==================================================
                ERROR MESSAGE
            =================================================== */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="
                  mb-6
                  flex
                  gap-3
                  rounded-xl
                  border
                  border-destructive/20
                  bg-destructive/10
                  p-4
                  text-sm
                  text-destructive
                "
              >
                <AlertCircle
                  className="mt-0.5 shrink-0"
                  size={19}
                />

                <div>
                  <p className="font-semibold">
                    Unable to send message
                  </p>

                  <p className="mt-1 leading-6">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
            >
              {/* ==================================================
                  NAME + EMAIL
              =================================================== */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    minLength={NAME_MIN_LENGTH}
                    maxLength={NAME_MAX_LENGTH}
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Your name"
                    disabled={loading}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name
                        ? "name-error"
                        : undefined
                    }
                    className={`
                      w-full
                      rounded-xl
                      border
                      bg-background
                      px-4
                      py-3
                      text-sm
                      text-foreground
                      outline-none
                      transition-colors
                      placeholder:text-muted-foreground
                      focus:border-primary
                      focus:ring-4
                      focus:ring-primary/10
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      ${
                        errors.name
                          ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                          : "border-input"
                      }
                    `}
                  />

                  {errors.name && (
                    <p
                      id="name-error"
                      role="alert"
                      className="mt-2 text-xs leading-5 text-destructive"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="you@example.com"
                    disabled={loading}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email
                        ? "email-error"
                        : undefined
                    }
                    className={`
                      w-full
                      rounded-xl
                      border
                      bg-background
                      px-4
                      py-3
                      text-sm
                      text-foreground
                      outline-none
                      transition-colors
                      placeholder:text-muted-foreground
                      focus:border-primary
                      focus:ring-4
                      focus:ring-primary/10
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      ${
                        errors.email
                          ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                          : "border-input"
                      }
                    `}
                  />

                  {errors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="mt-2 text-xs leading-5 text-destructive"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* ==================================================
                  SUBJECT
              =================================================== */}
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Subject
                </label>

                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  minLength={SUBJECT_MIN_LENGTH}
                  maxLength={SUBJECT_MAX_LENGTH}
                  value={form.subject}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="What can we help you with?"
                  disabled={loading}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={
                    errors.subject
                      ? "subject-error"
                      : undefined
                  }
                  className={`
                    w-full
                    rounded-xl
                    border
                    bg-background
                    px-4
                    py-3
                    text-sm
                    text-foreground
                    outline-none
                    transition-colors
                    placeholder:text-muted-foreground
                    focus:border-primary
                    focus:ring-4
                    focus:ring-primary/10
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    ${
                      errors.subject
                        ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                        : "border-input"
                    }
                  `}
                />

                {errors.subject && (
                  <p
                    id="subject-error"
                    role="alert"
                    className="mt-2 text-xs leading-5 text-destructive"
                  >
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* ==================================================
                  MESSAGE
              =================================================== */}
              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Message
                </label>

                <textarea
                  id="message"
                  name="message"
                  required
                  minLength={MESSAGE_MIN_LENGTH}
                  maxLength={MESSAGE_MAX_LENGTH}
                  rows={7}
                  value={form.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Describe your question or issue..."
                  disabled={loading}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={
                    errors.message
                      ? "message-error"
                      : undefined
                  }
                  className={`
                    w-full
                    resize-y
                    rounded-xl
                    border
                    bg-background
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-foreground
                    outline-none
                    transition-colors
                    placeholder:text-muted-foreground
                    focus:border-primary
                    focus:ring-4
                    focus:ring-primary/10
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    ${
                      errors.message
                        ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                        : "border-input"
                    }
                  `}
                />

                <div className="mt-2 flex items-start justify-between gap-3">
                  {errors.message ? (
                    <p
                      id="message-error"
                      role="alert"
                      className="text-xs leading-5 text-destructive"
                    >
                      {errors.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Please provide enough detail for us to
                      understand the issue.
                    </p>
                  )}

                  <p
                    className={`
                      shrink-0
                      text-xs
                      ${
                        form.message.length >
                        MESSAGE_MAX_LENGTH * 0.9
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }
                    `}
                  >
                    {form.message.length}/{MESSAGE_MAX_LENGTH}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  SUBMIT
              =================================================== */}
              <button
                type="submit"
                disabled={loading}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-primary
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-primary-foreground
                  shadow-sm
                  transition-colors
                  hover:bg-primary/90
                  focus:outline-none
                  focus:ring-4
                  focus:ring-primary/20
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:w-auto
                "
              >
                {loading ? (
                  <>
                    <span
                      className="
                        h-4
                        w-4
                        animate-spin
                        rounded-full
                        border-2
                        border-primary-foreground/40
                        border-t-primary-foreground
                      "
                      aria-hidden="true"
                    />

                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

