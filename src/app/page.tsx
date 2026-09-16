import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listSummaries } from "@/lib/summaries";
import { SignOutButton } from "./sign-out-button";
import { SiftBar } from "@/components/sift-bar";
import { SummaryCards } from "@/components/summary-cards";
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
  const summaries = session ? await listSummaries(session.user.id) : [];

  return (
    <main className="flex flex-1 flex-col gap-6 bg-muted/30 p-8">
      <div className="flex justify-end">
        <div className="w-full max-w-2xl">
          <SiftBar savedVideoIds={summaries.map((s) => s.videoId)} />
        </div>
      </div>

      {session ? (
        <SummaryCards summaries={summaries} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>
                <h1>My ADE</h1>
              </CardTitle>
              <CardDescription>You are not signed in.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link href="/login" className={buttonVariants()}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ variant: "outline" })}
              >
                Sign up
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {session ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Signed in as {session.user.name} ({session.user.email})
          </span>
          <SignOutButton />
        </div>
      ) : null}
    </main>
  );
}
