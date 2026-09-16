import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";
import { SiftBar } from "@/components/sift-bar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="flex flex-1 flex-col gap-6 bg-muted/30 p-8">
      <div className="flex justify-end">
        <div className="w-full max-w-2xl">
          <SiftBar />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>My ADE</h1>
          </CardTitle>
          <CardDescription>
            {session
              ? `Signed in as ${session.user.name} (${session.user.email})`
              : "You are not signed in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {session ? (
            <SignOutButton />
          ) : (
            <>
              <Link href="/login" className={buttonVariants()}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ variant: "outline" })}
              >
                Sign up
              </Link>
            </>
          )}
        </CardContent>
        </Card>
      </div>
    </main>
  );
}
