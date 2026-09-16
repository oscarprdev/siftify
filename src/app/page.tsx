import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listSummaries } from "@/lib/summaries";
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
  const summaries = session ? await listSummaries(session.user.id) : [];

  return (
    <main className="flex flex-1 flex-col gap-6 bg-muted/30 p-8">
      <div className="flex justify-end">
        <div className="w-full max-w-2xl">
          <SiftBar savedVideoIds={summaries.map((s) => s.videoId)} />
        </div>
      </div>

      {session ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <Card key={summary.id} id={`sift-${summary.videoId}`} className="scroll-mt-6">
              <a href={summary.url} target="_blank" rel="noreferrer">
                <Image
                  src={`https://i.ytimg.com/vi/${summary.videoId}/hqdefault.jpg`}
                  alt=""
                  width={480}
                  height={360}
                  className="aspect-video w-full object-cover"
                />
              </a>
              <CardHeader>
                <CardTitle>
                  <a href={summary.url} target="_blank" rel="noreferrer" className="block truncate underline-offset-4 hover:underline">
                    {summary.title}
                  </a>
                </CardTitle>
                <CardDescription>
                  {summary.source} · {summary.topics.length} topic
                  {summary.topics.length === 1 ? "" : "s"} ·{" "}
                  <time dateTime={summary.createdAt}>
                    {new Date(summary.createdAt).toLocaleDateString()}
                  </time>
                </CardDescription>
              </CardHeader>
              <CardContent className="line-clamp-3 text-muted-foreground">
                {summary.tldr}
              </CardContent>
            </Card>
          ))}
        </div>
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
