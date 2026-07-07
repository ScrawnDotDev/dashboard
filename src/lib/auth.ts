import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { db } from "./db"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
  baseURL: process.env.BETTER_AUTH_BASE_URL,
})
