import { createServerFn } from "@tanstack/react-start"
import { apiGet, apiPost, validator } from "./core"

export const listDeliveries = createServerFn({ method: "GET" })
  .inputValidator(
    validator<{ projectId: string; apiKeyId?: string; eventType?: string; status?: string; role?: string; limit?: number; offset?: number }>()
  )
  .handler(async (ctx) => {
    const params = new URLSearchParams()
    if (ctx.data.apiKeyId) params.set("apiKeyId", ctx.data.apiKeyId)
    if (ctx.data.eventType) params.set("eventType", ctx.data.eventType)
    if (ctx.data.status) params.set("status", ctx.data.status)
    if (ctx.data.role) params.set("role", ctx.data.role)
    if (ctx.data.limit) params.set("limit", String(ctx.data.limit))
    if (ctx.data.offset) params.set("offset", String(ctx.data.offset))
    return apiGet(ctx.data.projectId, `/api/v1/internals/webhook-deliveries?${params}`)
  })

export const sendTestWebhook = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; apiKeyId: string }>())
  .handler(async (ctx) => {
    const { projectId, ...payload } = ctx.data
    return apiPost(projectId, "/api/v1/internals/webhook-endpoint/send-test", payload)
  })

export const setWebhookUrl = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; apiKeyId: string; url: string }>())
  .handler(async (ctx) => {
    const { projectId, ...payload } = ctx.data
    return apiPost(projectId, "/api/v1/internals/webhook-endpoint", payload)
  })
