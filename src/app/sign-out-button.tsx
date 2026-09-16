"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.signOut();
        if (error) {
          setPending(false);
          return;
        }
        router.push("/login");
      }}
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      Sign out
    </Button>
  );
}
