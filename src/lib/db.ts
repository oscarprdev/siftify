import { Pool } from "pg";

/** Shared connection pool — better-auth and the app tables use the same database. */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
