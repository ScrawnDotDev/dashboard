import { createServerFn } from "@tanstack/react-start"
import { db } from "@/lib/db"
import { user } from "@/db/schema"
import { count } from "drizzle-orm"
import { validator } from "./core"

export const checkUsersExist = createServerFn({ method: "GET" }).handler(
  async () => {
    const [result] = await db.select({ count: count() }).from(user)
    return { exists: (result?.count ?? 0) > 0 }
  }
)

export const createAdminUser = createServerFn({ method: "POST" })
  .inputValidator(
    validator<{
      name: string
      email: string
      password: string
    }>()
  )
  .handler(async (ctx) => {
    const [existing] = await db.select({ count: count() }).from(user)
    if ((existing?.count ?? 0) > 0) {
      return { error: "An admin user already exists" }
    }

    const { auth } = await import("@/lib/auth")

    await auth.api.signUpEmail({
      body: {
        name: ctx.data.name,
        email: ctx.data.email,
        password: ctx.data.password,
      },
    })

    return { success: true }
  })
