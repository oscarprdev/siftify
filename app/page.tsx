import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-8 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          My ADE
        </h1>
        {session ? (
          <>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Signed in as{" "}
              <span className="font-medium text-black dark:text-zinc-50">
                {session.user.name}
              </span>{" "}
              ({session.user.email})
            </p>
            <div className="mt-6">
              <SignOutButton />
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              You are not signed in.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/login"
                className="rounded-md bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-black/[.12] px-4 py-2 font-medium text-black dark:border-white/[.2] dark:text-zinc-50"
              >
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
