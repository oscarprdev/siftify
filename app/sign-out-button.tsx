"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-md border border-black/[.12] px-4 py-2 font-medium text-black dark:border-white/[.2] dark:text-zinc-50"
      onClick={async () => {
        const { error } = await authClient.signOut();
        if (error) return;
        router.push("/login");
      }}
    >
      Sign out
    </button>
  );
}
