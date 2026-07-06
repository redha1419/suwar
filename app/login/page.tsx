import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center font-display text-4xl italic tracking-wide text-foreground">
          Suwar
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
