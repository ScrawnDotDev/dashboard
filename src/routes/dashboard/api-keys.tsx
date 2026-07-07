import { useState } from "react"
import { createFileRoute, useNavigate, Outlet, useLocation } from "@tanstack/react-router"
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from "@/lib/scrawn-server"
import { useCachedData, TTL, invalidateCache, useIsRefreshing } from "@/lib/useCache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useProject } from "@/lib/ProjectContext"

export const Route = createFileRoute("/dashboard/api-keys")({
  head: () => ({
    meta: [
      {
        title: "API Keys | Scrawn Access Tokens",
      },
      {
        name: "description",
        content: "Generate, inspect, and revoke secure API keys for production and development networks in your Scrawn billing console.",
      },
      {
        name: "og:title",
        content: "API Keys | Scrawn Access Tokens",
      },
      {
        name: "og:description",
        content: "Generate, inspect, and revoke secure API keys for production and development networks in your Scrawn billing console.",
      },
      {
        name: "og:image",
        content: "/og.jpg",
      },
      {
        name: "twitter:title",
        content: "API Keys | Scrawn Access Tokens",
      },
      {
        name: "twitter:description",
        content: "Generate, inspect, and revoke secure API keys for production and development networks in your Scrawn billing console.",
      },
      {
        name: "twitter:image",
        content: "/og.jpg",
      },
    ],
  }),
  component: ApiKeysLayout,
})



function ApiKeysLayout() {
  const location = useLocation()

  if (location.pathname !== "/dashboard/api-keys") {
    return <Outlet />
  }

  return <ApiKeysList />
}

function ApiKeysList() {
  const navigate = useNavigate()
  const { activeProjectId } = useProject()
  const CACHE_KEY = activeProjectId ? `api-keys-${activeProjectId}` : "api-keys"

  const {
    data: keysData,
    loading,
    refresh,
  } = useCachedData(
    CACHE_KEY,
    async () => activeProjectId ? listApiKeys({ data: { projectId: activeProjectId } }) : { keys: [] },
    TTL.API_KEYS
  )
  const keys =
    ((keysData as { keys: Array<Record<string, unknown>> } | null)?.keys) ?? []

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [role, setRole] = useState<"test" | "production">("test")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const refreshing = useIsRefreshing()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setCreating(true)
    try {
      if (!activeProjectId) throw new Error("No active project")
      const data = (await createApiKey({
        data: { projectId: activeProjectId, name, role, expiresIn: 365 * 24 * 60 * 60, webhookUrl },
      })) as Record<string, unknown>
      setCreatedKey(data.key as string)
      setName("")
      setWebhookUrl("")
      setShowCreate(false)
      invalidateCache(CACHE_KEY)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id)
    try {
      if (!activeProjectId) return
      await revokeApiKey({ data: { projectId: activeProjectId, id } })
      invalidateCache(CACHE_KEY)
      await refresh()
    } catch {
    } finally {
      setRevoking(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
            API Keys
          </h1>
          <span className="border-2 border-black bg-[#ff00ff] px-2 py-0.5 font-mono text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg] dark:border-white dark:text-white">
            Access Tokens
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreate(true)} disabled={creating} variant="fuchsia">
            {creating ? "CREATING..." : "CREATE KEY"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            {refreshing ? "REFRESHING..." : "REFRESH"}
          </Button>
        </div>
      </div>

      {createdKey && (
        <Card className="border-2 border-green-600 bg-green-200 shadow-[2px_2px_0px_0px_rgba(22,163,74,1)] dark:border-green-400 dark:bg-green-900 dark:shadow-[2px_2px_0px_0px_rgba(74,222,128,1)]">
          <CardContent className="p-4">
            <p className="font-mono text-xs font-black text-green-900 uppercase dark:text-green-100">
              Key Created — Copy It Now. You Won't See It Again!
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold break-all text-black dark:border-white dark:bg-black dark:text-white">
                {createdKey}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copyToClipboard(createdKey)}
              >
                COPY
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <Card className="border-3 border-black dark:border-white bg-yellow-400 dark:bg-yellow-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <CardHeader className="border-b-2 border-black dark:border-black pb-3">
            <CardTitle className="text-black dark:text-black">New API Key</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Key name (e.g. Production Billing)"
                  className="border-2 border-black bg-white px-3 py-2 text-sm font-mono text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:border-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <select
                  className="border-2 border-black bg-white px-3 py-2 font-mono text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none dark:bg-black dark:text-white dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "test" | "production")
                  }
                >
                  <option value="test">Test</option>
                  <option value="production">Production</option>
                </select>
                <input
                  type="url"
                  placeholder="Webhook URL"
                  className="border-2 border-black bg-white px-3 py-2 text-sm font-mono text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:border-white"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              {error && (
                <p className="w-max bg-black px-2 py-1 font-mono text-xs font-bold text-red-500">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  CANCEL
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="bg-black text-white dark:bg-white dark:text-black"
                  disabled={creating}
                >
                  CREATE
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 font-mono">Loading keys...</p>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-black bg-white dark:bg-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <span className="font-mono text-3xl text-neutral-300 dark:text-neutral-700">—</span>
          <p className="font-mono text-xs font-bold text-neutral-400 uppercase">No API Keys Yet</p>
          <p className="font-mono text-[10px] text-neutral-400">Create your first key to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {keys.map((k: Record<string, unknown>) => {
            const keyId = k.id as string
            return (
              <div key={keyId} className="w-full">
                <Card
                  className="cursor-pointer border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-none"
                  onClick={() => navigate({ to: "/dashboard/api-keys/$keyId", params: { keyId } })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-black text-black uppercase truncate dark:text-white">
                            {k.name as string}
                          </p>
                          <span
                            className={`border-2 border-black px-1.5 py-0.5 font-mono text-xs font-bold uppercase shrink-0 ${
                              k.role === "production"
                                ? "bg-yellow-400 text-black"
                                : "bg-blue-400 text-black"
                            }`}
                          >
                            {k.role as string}
                          </span>
                          {!!k.revoked && (
                            <span className="border-2 border-black bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white uppercase shrink-0">
                              Revoked
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400 font-mono">
                          {keyId.slice(0, 14)}...
                        </p>
                      </div>
                      {!k.revoked && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmRevoke(keyId)
                          }}
                        >
                          REVOKE
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmRevoke !== null}
        title="Revoke API Key"
        message="This will permanently revoke the API key. Any services using this key will immediately lose access."
        confirmText="REVOKE"
        matchValue={keys.find((k) => k.id === confirmRevoke)?.name as string ?? ""}
        onConfirm={() => {
          if (confirmRevoke) handleRevoke(confirmRevoke)
          setConfirmRevoke(null)
        }}
        onCancel={() => setConfirmRevoke(null)}
        loading={revoking !== null}
      />
    </div>
  )
}
