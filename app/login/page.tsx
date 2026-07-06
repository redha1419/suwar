import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-light tracking-wide text-neutral-100">
          suwar
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
