import { scrawn } from "@scrawn/core"
import { Analytics } from "@scrawn/analytics"

export const biller = scrawn({
  apiKey: process.env.SCRAWN_KEY as `scrn_${string}`,
  baseURL: process.env.SCRAWN_BASE_URL || "http://localhost:8069",
  httpUrl: process.env.SCRAWN_HTTP_URL || "http://localhost:8070",
  secure: false,
})

export function createAnalytics(apiKey?: string): Analytics {
  const effectiveKey = apiKey || process.env.SCRAWN_KEY
  if (!effectiveKey) {
    throw new Error(
      "No API key available for analytics — provide one or set SCRAWN_KEY"
    )
  }

  const localBiller = scrawn({
    apiKey: effectiveKey as `scrn_${string}`,
    baseURL: process.env.SCRAWN_BASE_URL || "http://localhost:8069",
    httpUrl: process.env.SCRAWN_HTTP_URL || "http://localhost:8070",
    secure: false,
  })
  return new Analytics(localBiller)
}
