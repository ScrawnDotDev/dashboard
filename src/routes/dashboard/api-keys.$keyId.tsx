import { useState } from "react"
import { createFileRoute, useParams } from "@tanstack/react-router"
import {
  listApiKeys,
  setWebhookUrl as updateWebhookUrl,
  getApiKeySummary,
  sendTestWebhook,
} from "@/lib/scrawn-server"
import {
  useCachedData,
  TTL,
  invalidateCache,
  RefreshContext,
} from "@/lib/useCache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EventList } from "@/components/events/EventList"
import { WebhookList } from "@/components/webhooks/WebhookList"
import { useContext } from "react"
import { useProject } from "@/lib/ProjectContext"

export const Route = createFileRoute("/dashboard/api-keys/$keyId")({
  component: ApiKeyDetailPage,
})

function ApiKeyDetailPage() {
  const { keyId } = useParams({ from: "/dashboard/api-keys/$keyId" })
  const { activeProjectId } = useProject()
  const keys = useCachedData(
    activeProjectId ? `api-key-detail-${activeProjectId}` : "api-key-detail",
    async () => {
      if (!activeProjectId) {
        throw new Error("Waiting for active project...")
      }
      return listApiKeys({ data: { projectId: activeProjectId } })
    },
    TTL.API_KEYS
  )
  const summary = useCachedData(
    activeProjectId ? `api-key-summary-${keyId}-${activeProjectId}` : `api-key-summary-${keyId}`,
    async () => {
      if (!activeProjectId) {
        throw new Error("Waiting for active project...")
      }
      return getApiKeySummary({ data: { projectId: activeProjectId, apiKeyId: keyId } })
    },
    TTL.DASHBOARD_SUMMARY
  )
  const { triggerRefresh } = useContext(RefreshContext)

  const allKeys =
    (keys.data as { keys: Array<Record<string, unknown>> } | null)?.keys ?? []
  const key = allKeys.find((k) => k.id === keyId) as
    | Record<string, unknown>
    | undefined

  const [editingWebhook, setEditingWebhook] = useState(false)
  const [editUrl, setEditUrl] = useState("")
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testError, setTestError] = useState("")

  const keyName = (key?.name as string) ?? "Unknown"
  const keyRole = (key?.role as string) ?? ""
  const webhookUrl = (key?.webhookUrl as string) ?? ""
  const webhookPublicKey = (key?.webhookPublicKey as string) ?? ""
  const isRevoked = !!key?.revoked

  async function handleSaveWebhook() {
    setSavingWebhook(true)
    try {
      if (!activeProjectId) throw new Error("No active project")
      await updateWebhookUrl({
        data: { projectId: activeProjectId, apiKeyId: keyId, url: editUrl },
      })
      setEditingWebhook(false)
      invalidateCache(
        activeProjectId ? `api-key-detail-${activeProjectId}` : "api-key-detail"
      )
      triggerRefresh()
    } catch {
    } finally {
      setSavingWebhook(false)
    }
  }

  async function handleSendTest() {
    setTestError("")
    setSendingTest(true)
    try {
      if (!activeProjectId) throw new Error("No active project")
      await sendTestWebhook({
        data: { projectId: activeProjectId, apiKeyId: keyId },
      })
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed")
    } finally {
      setSendingTest(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  if (keys.loading) return null
  if (!key) {
    return (
      <div className="flex flex-col gap-6">
        <p className="font-mono text-sm font-bold text-red-500 uppercase">
          Key Not Found
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
            {keyName}
          </h1>
          {keyRole && (
            <span
              className={`border-2 border-black px-1.5 py-0.5 font-mono text-xs font-bold uppercase ${
                keyRole === "production"
                  ? "bg-yellow-400 text-black"
                  : "bg-blue-400 text-black"
              }`}
            >
              {keyRole}
            </span>
          )}
          {isRevoked && (
            <span className="border-2 border-black bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white uppercase">
              Revoked
            </span>
          )}
        </div>
      </div>

      {summary.loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-[100px] w-full rounded-none border-2 border-black dark:border-white"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-black text-black dark:text-white">
                {Number(summary.data?.totalRevenue ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-black text-black dark:text-white">
                {Number(summary.data?.totalEvents ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Total Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-black text-black dark:text-white">
                {Number(summary.data?.totalCredits ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isRevoked && (
        <Card className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {editingWebhook ? (
              <div className="flex items-center gap-2">
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 border-2 border-black bg-white px-3 py-2 font-mono text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none dark:border-white dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                />
                <Button
                  size="sm"
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook}
                >
                  {savingWebhook ? "..." : "SAVE"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingWebhook(false)}
                >
                  CANCEL
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-400 uppercase">
                    Webhook:
                  </span>
                  <span className="flex-1 truncate font-mono text-sm font-bold text-black dark:text-white">
                    {webhookUrl || "Not configured"}
                  </span>
                  <button
                    onClick={() => {
                      setEditUrl(webhookUrl)
                      setEditingWebhook(true)
                    }}
                    className="border-2 border-black px-2 py-1 font-mono text-xs font-bold text-black uppercase hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
                  >
                    {webhookUrl ? "EDIT" : "ADD"}
                  </button>
                </div>
                {webhookPublicKey && (
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-xs text-gray-400 uppercase">
                      PubKey:
                    </span>
                    <span className="flex-1 truncate font-mono text-sm font-bold text-black dark:text-white">
                      {webhookPublicKey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(webhookPublicKey)}
                      className="border-2 border-black px-2 py-1 font-mono text-xs font-bold text-black uppercase hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
                    >
                      COPY
                    </button>
                  </div>
                )}
                {keyRole === "test" && !isRevoked && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSendTest}
                      disabled={sendingTest}
                    >
                      {sendingTest ? "..." : "SEND TEST WEBHOOK"}
                    </Button>
                  </div>
                )}
                {testError && (
                  <p className="mt-2 border-2 border-red-500 bg-white px-2 py-1 font-mono text-xs font-bold text-red-600 dark:bg-black">
                    {testError}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <EventList apiKeyId={keyId} compact title="Recent Events" />

      <WebhookList apiKeyId={keyId} compact title="Recent Webhooks" />
    </div>
  )
}
