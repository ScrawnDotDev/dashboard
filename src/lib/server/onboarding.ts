import { createServerFn } from "@tanstack/react-start"
import { validator } from "./core"
import { db } from "../db"
import { eq } from "drizzle-orm"
import { org, project } from "@/db/schema"
import { randomUUID } from "crypto"
import { getRequest, useSession } from "@tanstack/react-start/server"
import { auth } from "../auth"
import { sessionConfig } from "./cache"

const SCRAWN_HTTP_URL = process.env.SCRAWN_HTTP_URL || "http://localhost:8070"

export const getBackendConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request?.headers,
    })

    if (!session) return { configured: false }

    const userOrg = await db.query.org.findFirst({
      where: eq(org.userId, session.user.id),
    })

    if (!userOrg) return { configured: false }

    const projects = await db.query.project.findMany({
      where: eq(project.orgId, userOrg.orgId),
      limit: 1,
    })

    if (projects.length === 0) return { configured: false }

    return { configured: true }
  }
)

export const submitOnboarding = createServerFn({ method: "POST" })
  .inputValidator(
    validator<{
      name: string
      dodoLiveApiKey: string
      dodoTestApiKey: string
      currency: string
      redirectUrl: string
    }>()
  )
  .handler(async (ctx) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request?.headers,
    })

    if (!session) {
      return { error: "Unauthorized" }
    }

    const userId = session.user.id

    const MASTER_API_KEY = process.env.MASTER_API_KEY
    if (!MASTER_API_KEY) {
      return { error: "Master API Key is not set on the server" }
    }

    const res = await fetch(`${SCRAWN_HTTP_URL}/api/v1/internals/onboarding`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MASTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...ctx.data }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body.error || "Failed to save configuration" }
    }

    const data = await res.json().catch(() => ({}))

    const returnedProjectId = data.projectId
    const dashboardKey = data.apiKey

    if (!returnedProjectId) {
      return { error: "The project id is undefined" }
    }

    if (!dashboardKey) {
      return { error: "The dashboard key is undefined" }
    }

    await db.transaction(async (tx) => {
      let userOrg = await tx.query.org.findFirst({
        where: eq(org.userId, userId),
      })

      if (!userOrg) {
        const newOrgId = randomUUID()
        const [newOrg] = await tx
          .insert(org)
          .values({
            orgId: newOrgId,
            userId: userId,
          })
          .returning()
        userOrg = newOrg
      }

      await tx.insert(project).values({
        projectId: returnedProjectId,
        orgId: userOrg.orgId,
      })
    })

    const appSession = await useSession(sessionConfig)
    await appSession.update({
      ...appSession.data,
      dashboard_keys: {
        ...(appSession.data.dashboard_keys || {}),
        [returnedProjectId]: dashboardKey,
      },
    })

    return { success: true }
  })
