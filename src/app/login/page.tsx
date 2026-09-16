"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogInIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";

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
    <Alert variant="destructive">
      <AlertDescription>
        {description ||
          (code === "access_denied"
            ? "GitHub sign in was cancelled"
            : `GitHub sign in failed (${code})`)}
      </AlertDescription>
    </Alert>
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
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Sign in</h1>
          </CardTitle>
          <CardDescription>
            Use your email and password, or your GitHub account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signInEmail}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={error ? true : undefined}
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  aria-invalid={error ? true : undefined}
                />
              </Field>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Signing in…" : "Sign in"}
              </Button>
              <FieldSeparator>or</FieldSeparator>
              <Button type="button" variant="outline" onClick={signInGitHub}>
                <LogInIcon data-icon="inline-start" />
                Sign in with GitHub
              </Button>
            </FieldGroup>
          </form>

          <div className="mt-4 flex flex-col gap-4">
            <Suspense fallback={null}>
              <OAuthError />
            </Suspense>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <FieldDescription className="mt-6">
            No account? <Link href="/signup">Sign up</Link>
          </FieldDescription>
        </CardContent>
      </Card>
    </main>
  );
}
