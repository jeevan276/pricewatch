import SignUpForm from "../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <main
      className="
        flex min-h-screen items-center justify-center
        bg-slate-50 px-4 py-12
        text-slate-900
        transition-colors
        dark:bg-slate-950
        dark:text-slate-100
      "
    >
      <SignUpForm />
    </main>
  );
}