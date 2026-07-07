import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { listDeliveries, listApiKeys } from "@/lib/scrawn-server"
import { useCachedData, TTL } from "@/lib/useCache"
import { useMode } from "@/lib/ModeContext"
import { WebhookFilters, type WebhookFiltersValue } from "@/components/webhooks/WebhookFilters"
import { Button } from "@/components/ui/button"
import { useProject } from "@/lib/ProjectContext"

const DODO_WEBHOOK_EVENTS = [
  "payment.succeeded",
  "payment.failed",
  "payment.processing",
  "payment.cancelled",
  "subscription.active",
  "subscription.updated",
  "subscription.on_hold",
  "subscription.renewed",
  "subscription.plan_changed",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
  "refund.succeeded",
  "dispute.opened",
  "license_key.created",
  "credit.added",
  "credit.deducted",
  "credit.expired",
  "credit.rolled_over",
  "credit.rollover_forfeited",
  "credit.overage_charged",
  "credit.manual_adjustment",
  "credit.balance_low"
]

export const Route = createFileRoute("/dashboard/webhooks")({
  head: () => ({
    meta: [
      {
        title: "Webhooks Log | Scrawn Telemetry Deliveries",
      },
      {
        name: "description",
        content: "Monitor webhook deliveries, review HTTP response payloads, inspect error logs, and track events dispatched from DodoPayments in real-time.",
      },
      {
        name: "og:title",
        content: "Webhooks Log | Scrawn Telemetry Deliveries",
      },
      {
        name: "og:description",
        content: "Monitor webhook deliveries, review HTTP response payloads, inspect error logs, and track events dispatched from DodoPayments in real-time.",
      },
      {
        name: "og:image",
        content: "/og.jpg",
      },
      {
        name: "twitter:title",
        content: "Webhooks Log | Scrawn Telemetry Deliveries",
      },
      {
        name: "twitter:description",
        content: "Monitor webhook deliveries, review HTTP response payloads, inspect error logs, and track events dispatched from DodoPayments in real-time.",
      },
      {
        name: "twitter:image",
        content: "/og.jpg",
      },
    ],
  }),
  component: WebhooksPage,
})

function WebhooksPage() {
  const [filters, setFilters] = useState<WebhookFiltersValue>({})
  const [page, setPage] = useState(0)
  const { mode, setMode } = useMode()

  const roleParam = mode === "all" ? undefined : mode

  const { activeProjectId } = useProject()

  const keys = useCachedData(
    activeProjectId ? `webhooks-page-keys-${activeProjectId}` : "webhooks-page-keys",
    async () => activeProjectId ? listApiKeys({ data: { projectId: activeProjectId } }) : { keys: [] },
    TTL.API_KEYS
  )

  const { data: deliveriesData, loading, refresh } = useCachedData(
    activeProjectId ? `webhook-deliveries:proj=${activeProjectId}:mode=${mode}:apiKeyId=${filters.apiKeyId ?? ""}:eventType=${filters.eventType ?? ""}:status=${filters.status ?? ""}:page=${page}` : "webhook-deliveries",
    async () => activeProjectId ? listDeliveries({ data: { projectId: activeProjectId, apiKeyId: filters.apiKeyId, eventType: filters.eventType, status: filters.status, role: roleParam, limit: 20, offset: page * 20 } }) : { deliveries: [] },
    TTL.WEBHOOK_DELIVERIES
  )
  const deliveries =
    (deliveriesData as { deliveries: Array<Record<string, unknown>> } | null)
      ?.deliveries ?? []
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const keysData = (keys.data as { keys: Array<Record<string, unknown>> } | null)?.keys ?? []
  const apiKeyOptions = keysData.map((k) => ({
    value: k.id as string,
    label: k.name as string,
  }))
  const eventTypeOptions = DODO_WEBHOOK_EVENTS

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
            Webhooks
          </h1>
          <span className="border-2 border-black bg-[#38bdf8] px-2 py-0.5 font-mono text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-[1deg] dark:border-white dark:text-black">
            Deliveries
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            {(["all", "test", "production"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 font-mono text-xs font-black uppercase transition-colors ${
                  mode === m
                    ? "bg-yellow-400 text-black dark:bg-yellow-500"
                    : "text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={refresh} disabled={loading}>
            REFRESH
          </Button>
        </div>
      </div>

      <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-card dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <WebhookFilters
          value={filters}
          onChange={(v) => { setFilters(v); setPage(0) }}
          apiKeyOptions={apiKeyOptions}
          eventTypeOptions={eventTypeOptions}
          loading={loading}
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 font-mono">Loading logs...</p>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-black bg-white dark:bg-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <span className="font-mono text-3xl text-neutral-300 dark:text-neutral-700">—</span>
          <p className="font-mono text-xs font-bold text-neutral-400 uppercase">No Deliveries Yet</p>
          <p className="font-mono text-[10px] text-neutral-400">Webhook deliveries will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {deliveries.map((d: Record<string, unknown>) => (
            <div
              key={d.id as string}
              className={`border-2 border-black bg-white dark:bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ${d.status === "delivered" ? "border-l-8 border-l-green-500" : "border-l-8 border-l-red-500"}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between border-b-2 border-black pb-3 dark:border-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-3 w-3 ${d.status === "delivered" ? "bg-green-500" : "animate-pulse bg-red-500"}`}
                      />
                      <span className="font-mono text-sm font-black text-black uppercase dark:text-white">
                        {String(d.eventType ?? "")}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        {String(d.resource ?? "")}.{String(d.action ?? "")}
                      </span>
                      <span
                        className={`border-2 border-black px-1.5 py-0.5 font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${d.apiKeyRole === "production" ? "bg-yellow-400 text-black dark:bg-yellow-500" : "bg-blue-400 text-black dark:bg-blue-500"}`}
                      >
                        {String(d.apiKeyRole ?? "")}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-neutral-400">
                      <p>ID: {String(d.eventId ?? "")}</p>
                      {!!d.endpointUrl && <p>ENDPOINT: <code className="font-bold break-all text-black dark:text-white">{String(d.endpointUrl)}</code></p>}
                      {!!d.apiKeyName && <p>KEY: <span className="font-bold text-black dark:text-white">{String(d.apiKeyName)}</span></p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                      {new Date(String(d.createdAt ?? "")).toLocaleString()}
                    </p>
                    {d.responseStatus != null && (
                      <span
                        className={`border-2 border-black px-2 py-1 font-mono text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${Number(d.responseStatus) < 300 ? "bg-green-500 text-white" : "animate-pulse bg-red-500 text-white"}`}
                      >
                        HTTP {Number(d.responseStatus)}
                      </span>
                    )}
                  </div>
                </div>

                {d.error != null && (
                  <div className="mt-3 border-2 border-black bg-red-500 px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white">
                    <p className="font-mono text-xs font-bold text-white uppercase">
                      Error /// {String(d.error)}
                    </p>
                  </div>
                )}

                {!!d.requestBody && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toggleExpand(d.id as string)}
                    >
                      {expanded.has(d.id as string) ? "HIDE" : "SHOW"} PAYLOAD
                    </Button>
                    {expanded.has(d.id as string) && (
                      <pre className="mt-2 overflow-x-auto border-2 border-black bg-black p-3 font-mono text-xs text-green-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                        {JSON.stringify(d.requestBody, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && deliveries.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            PREV
          </Button>
          <span className="font-mono text-xs text-gray-500">Page {page + 1}</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={deliveries.length < 20}
            onClick={() => setPage(page + 1)}
          >
            NEXT
          </Button>
        </div>
      )}
    </div>
  )
}
