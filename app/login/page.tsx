"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// OAuth callback failures redirect back here with ?error=&error_description=.
function OAuthError() {
  const params = useSearchParams();
  const code = params.get("error");

  useEffect(() => {
    if (code) window.history.replaceState(null, "", window.location.pathname);
  }, [code]);

  if (!code) return null;
  const description = params.get("error_description");
  return (
    <p className="mt-4 text-sm text-red-600 dark:text-red-400">
      {description ||
        (code === "access_denied"
          ? "GitHub sign in was cancelled"
          : `GitHub sign in failed (${code})`)}
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Sign in failed");
    } else {
      router.push("/");
    }
  }

  async function signInGitHub() {
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
      errorCallbackURL: "/login",
    });
    if (error) setError(error.message ?? "GitHub sign in failed");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-8 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Sign in
        </h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={signInEmail}>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-black/[.12] px-3 py-2 text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-black/[.12] px-3 py-2 text-black dark:border-white/[.2] dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={signInGitHub}
          className="mt-3 w-full rounded-md border border-black/[.12] px-4 py-2 font-medium text-black dark:border-white/[.2] dark:text-zinc-50"
        >
          Sign in with GitHub
        </button>

        <Suspense fallback={null}>
          <OAuthError />
        </Suspense>

        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          No account?{" "}
          <Link href="/signup" className="font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
