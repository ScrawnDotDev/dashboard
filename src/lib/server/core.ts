import { getDashboardKey } from "./cache"

const SCRAWN_HTTP_URL = process.env.SCRAWN_HTTP_URL || "http://localhost:8070"

export function validator<T>(): { (): T; (value: unknown): T } {
  return ((input: unknown) => input as T) as { (): T; (value: unknown): T }
}

export async function apiGet(projectId: string, path: string) {
  const DASHBOARD_KEY = await getDashboardKey(projectId)
  if (!DASHBOARD_KEY) throw new Error("Dashboard API key not found for project")

  const res = await fetch(`${SCRAWN_HTTP_URL}${path}`, {
    headers: { Authorization: `Bearer ${DASHBOARD_KEY}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPost(projectId: string, path: string, body: unknown) {
  const DASHBOARD_KEY = await getDashboardKey(projectId)
  if (!DASHBOARD_KEY) throw new Error("Dashboard API key not found for project")

  const res = await fetch(`${SCRAWN_HTTP_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHBOARD_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiDelete(projectId: string, path: string) {
  const DASHBOARD_KEY = await getDashboardKey(projectId)
  if (!DASHBOARD_KEY) throw new Error("Dashboard API key not found for project")

  const res = await fetch(`${SCRAWN_HTTP_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${DASHBOARD_KEY}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}
