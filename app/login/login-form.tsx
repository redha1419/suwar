"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        autoComplete="username"
        required
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-2 outline-none focus:border-muted"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-2 outline-none focus:border-muted"
      />
      {state.error && (
        <p className="text-sm text-muted">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
