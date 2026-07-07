import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "../auth"
import { db } from "../db"
import { org, project } from "@/db/schema"
import { eq } from "drizzle-orm"
import { validator } from "./core"

const SCRAWN_HTTP_URL = process.env.SCRAWN_HTTP_URL || "http://localhost:8070"

export const listProjects = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request?.headers,
    })

    if (!session) return []

    const userOrg = await db.query.org.findFirst({
      where: eq(org.userId, session.user.id),
    })

    if (!userOrg) return []

    const projects = await db.query.project.findMany({
      where: eq(project.orgId, userOrg.orgId),
    })

    return projects.map((p) => p.projectId)
  }
)

export const listProjectConfigs = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request?.headers,
    })
    if (!session) throw new Error("Unauthorized")

    const userOrg = await db.query.org.findFirst({
      where: eq(org.userId, session.user.id),
    })
    if (!userOrg) throw new Error("No org found")

    const projects = await db.query.project.findMany({
      where: eq(project.orgId, userOrg.orgId),
    })

    const projectIds = projects.map((p) => p.projectId)
    if (projectIds.length === 0) return { projects: [] }

    const MASTER_API_KEY = process.env.MASTER_API_KEY
    if (!MASTER_API_KEY) {
      throw new Error("Master API Key is not set on the server")
    }

    const res = await fetch(
      `${SCRAWN_HTTP_URL}/api/v1/internals/projects/list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MASTER_API_KEY}`,
        },
        body: JSON.stringify({ projectIds }),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Backend returned ${res.status}`)
    }

    const data = await res.json()
    return { projects: data.projects || [] }
  }
)

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; [key: string]: any }>())
  .handler(async (ctx) => {
    const { data } = ctx
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request?.headers })
    if (!session) return { error: "Unauthorized" }

    const userOrg = await db.query.org.findFirst({
      where: eq(org.userId, session.user.id),
    })
    if (!userOrg) return { error: "No org found" }

    const proj = await db.query.project.findFirst({
      where: eq(project.projectId, data.projectId),
    })
    if (!proj || proj.orgId !== userOrg.orgId) {
      return { error: "Project not found or access denied" }
    }

    const {
      projectId,
      name,
      dodoLiveApiKey,
      dodoTestApiKey,
      dodoLiveProductId,
      dodoTestProductId,
      currency,
      redirectUrl,
    } = data as {
      projectId: string
      name?: string
      dodoLiveApiKey?: string
      dodoTestApiKey?: string
      dodoLiveProductId?: string
      dodoTestProductId?: string
      currency?: string
      redirectUrl?: string
    }
    const updates = {
      name,
      dodoLiveApiKey,
      dodoTestApiKey,
      dodoLiveProductId,
      dodoTestProductId,
      currency,
      redirectUrl,
    }

    const MASTER_API_KEY = process.env.MASTER_API_KEY
    if (!MASTER_API_KEY) {
      return { error: "Master API Key is not set on the server" }
    }

    const res = await fetch(
      `${SCRAWN_HTTP_URL}/api/v1/internals/projects/${projectId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MASTER_API_KEY}`,
        },
        body: JSON.stringify(updates),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err.message || "Failed to update project" }
    }

    return { success: true }
  })

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => {
    const { data } = ctx
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request?.headers })
    if (!session) return { error: "Unauthorized" }

    const userOrg = await db.query.org.findFirst({
      where: eq(org.userId, session.user.id),
    })
    if (!userOrg) return { error: "No org found" }

    const proj = await db.query.project.findFirst({
      where: eq(project.projectId, data.projectId),
    })
    if (!proj || proj.orgId !== userOrg.orgId) {
      return { error: "Project not found or access denied" }
    }

    const MASTER_API_KEY = process.env.MASTER_API_KEY
    if (!MASTER_API_KEY) {
      return { error: "Master API Key is not set on the server" }
    }

    const res = await fetch(
      `${SCRAWN_HTTP_URL}/api/v1/internals/projects/${data.projectId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${MASTER_API_KEY}`,
        },
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        error:
          "Failed to delete project on backend: " +
          (err.message || "Unknown error"),
      }
    }

    try {
      await db.delete(project).where(eq(project.projectId, data.projectId))
    } catch (e: any) {
      return { error: "Failed to delete project locally. " + e.message }
    }

    return { success: true }
  })
