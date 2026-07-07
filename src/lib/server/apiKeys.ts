import { createServerFn } from "@tanstack/react-start"
import { apiGet, apiPost, apiDelete, validator } from "./core"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "../auth"
import { db } from "../db"
import { org, project } from "@/db/schema"
import { eq } from "drizzle-orm"

const SCRAWN_HTTP_URL = process.env.SCRAWN_HTTP_URL || "http://localhost:8070"

export const listApiKeys = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => apiGet(ctx.data.projectId, "/api/v1/api-keys"))

export const createApiKey = createServerFn({ method: "POST" })
  .inputValidator(
    validator<{
      projectId: string
      name: string
      role: "test" | "production"
      expiresIn: number
      webhookUrl: string
    }>()
  )
  .handler(async (ctx) => {
    const { projectId, ...payload } = ctx.data
    return apiPost(projectId, "/api/v1/api-keys", payload)
  })

export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; id: string }>())
  .handler(async (ctx) =>
    apiDelete(ctx.data.projectId, `/api/v1/api-keys/${ctx.data.id}`)
  )

export const createDashboardKey = createServerFn({
  method: "POST",
})
  .inputValidator(validator<{ existingKeys?: string[] }>())
  .handler(async (ctx) => {
    const existingKeys = ctx.data.existingKeys || []
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request?.headers,
    })

    if (!session) {
      return { error: "Unauthorized" }
    }

    const userId = session.user.id

    let userOrg = await db.query.org.findFirst({
      where: eq(org.userId, userId),
    })

    if (!userOrg) {
      return { error: "User is not under any org" }
    }

    const allProjects = await db.query.project.findMany({
      where: eq(project.orgId, userOrg.orgId),
    })

    if (allProjects.length === 0) {
      return { error: "No projects found under this org" }
    }

    const projectsToFetch = allProjects.filter(
      (p) => !existingKeys.includes(p.projectId)
    )

    if (projectsToFetch.length === 0) {
      return { dashboardKeys: {}, errors: {} }
    }

    const MASTER_API_KEY = process.env.MASTER_API_KEY
    if (!MASTER_API_KEY) {
      return { error: "Master API Key is not set on the server" }
    }

    const fetchPromises = projectsToFetch.map(async (p) => {
      const res = await fetch(
        `${SCRAWN_HTTP_URL}/api/v1/create-dashboard-key/${p.projectId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MASTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          body.error || `Failed to create key for project ${p.projectId}`
        )
      }

      const data = await res.json().catch(() => ({}))

      if (!data.projectId || !data.apiKey) {
        throw new Error(`Invalid response for project ${p.projectId}`)
      }

      return {
        projectId: data.projectId as string,
        dashboardKey: data.apiKey as string,
      }
    })

    const results = await Promise.allSettled(fetchPromises)

    const dashboardKeys: Record<string, string> = {}
    const errors: Record<string, string> = {}

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const p = projectsToFetch[i]

      if (result.status === "fulfilled") {
        dashboardKeys[result.value.projectId] = result.value.dashboardKey
      } else {
        errors[p.projectId] = result.reason?.message || "Unknown error"
      }
    }

    return { dashboardKeys, errors }
  })
