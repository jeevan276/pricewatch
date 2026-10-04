import type {
  FormEventHandler,
  ReactNode,
} from "react";

interface AuthFormLayoutProps {
  title: string;
  description: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthFormLayout({
  title,
  description,
  onSubmit,
  children,
  footer,
}: AuthFormLayoutProps) {
  return (
   <div className="w-full max-w-md">
  <div className="mb-8 text-center">
    <h1 className="text-3xl font-bold text-heading">
      {title}
    </h1>

    <p className="mt-2 text-sm text-body">
      {description}
    </p>
  </div>

  <form
    onSubmit={onSubmit}
    className="rounded-2xl border border-border bg-secondary p-8 shadow-lg transition-colors"
  >
    {children}

    <div className="mt-6 text-center text-sm text-body">
      {footer}
    </div>
  </form>
</div>
  );
}