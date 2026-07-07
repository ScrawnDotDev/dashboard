import { createServerFn } from "@tanstack/react-start"
import { apiGet, apiPost, apiDelete, validator } from "./core"

export const listExpressions = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => apiGet(ctx.data.projectId, "/api/v1/expressions"))

export const createExpression = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; key: string; expr: string }>())
  .handler(async (ctx) => {
    const { projectId, ...payload } = ctx.data
    return apiPost(projectId, "/api/v1/expressions", payload)
  })

export const deleteExpression = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; key: string }>())
  .handler(async (ctx) =>
    apiDelete(
      ctx.data.projectId,
      `/api/v1/expressions/${encodeURIComponent(ctx.data.key)}`
    )
  )
