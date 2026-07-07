import { createServerFn } from "@tanstack/react-start"
import { apiGet, apiPost, apiDelete, validator } from "./core"

export const listTags = createServerFn({ method: "GET" })
  .inputValidator(validator<{ projectId: string }>())
  .handler(async (ctx) => apiGet(ctx.data.projectId, "/api/v1/tags"))

export const createTag = createServerFn({ method: "POST" })
  .inputValidator(
    validator<{ projectId: string; key: string; amount: number }>()
  )
  .handler(async (ctx) => {
    const { projectId, ...payload } = ctx.data
    return apiPost(projectId, "/api/v1/tags", payload)
  })

export const deleteTag = createServerFn({ method: "POST" })
  .inputValidator(validator<{ projectId: string; key: string }>())
  .handler(async (ctx) =>
    apiDelete(
      ctx.data.projectId,
      `/api/v1/tags/${encodeURIComponent(ctx.data.key)}`
    )
  )
