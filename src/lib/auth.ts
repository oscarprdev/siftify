import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "@/lib/db";

const github =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {};

export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  socialProviders: github,
  plugins: [nextCookies()],
});
