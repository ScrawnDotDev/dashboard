import { useState } from "react"
import { listDeliveries } from "@/lib/scrawn-server"
import { useCachedData } from "@/lib/useCache"
import { Pagination } from "@/components/ui/pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useProject } from "@/lib/ProjectContext"

interface WebhookListProps {
  apiKeyId?: string
  eventType?: string
  status?: string
  role?: string
  compact?: boolean
  pageSize?: number
  title?: string
}

export function WebhookList({
  apiKeyId,
  eventType,
  status,
  role,
  compact,
  pageSize = 8,
  title,
}: WebhookListProps) {
  const [page, setPage] = useState(0)
  const { activeProjectId } = useProject()

  const { data, loading, error } = useCachedData(
    activeProjectId
      ? `webhooks-list:proj=${activeProjectId}:${apiKeyId ?? ""}:${eventType ?? ""}:${status ?? ""}:${role ?? ""}:${page}`
      : "webhooks-list",
    async () =>
      activeProjectId
        ? listDeliveries({
            data: {
              projectId: activeProjectId,
              apiKeyId,
              eventType,
              status,
              role,
              limit: pageSize + 1,
              offset: page * pageSize,
            },
          })
        : { deliveries: [] },
    30000
  )

  const allDeliveries =
    (data as { deliveries: Array<Record<string, unknown>> } | null)
      ?.deliveries ?? []

  const hasMore = allDeliveries.length > pageSize
  const deliveries = allDeliveries.slice(0, pageSize)

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <CardHeader className="border-b-2 border-black pb-3 dark:border-white">
        <CardTitle className="text-sm">{title ?? "Recent Webhooks"}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading && !data ? (
          <div
            className={`w-full rounded-none border-2 border-black dark:border-white ${compact ? "h-[160px]" : "h-[300px]"}`}
          />
        ) : error ? (
          <p className="font-mono text-xs font-bold text-red-500">{error}</p>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <span className="font-mono text-2xl text-neutral-300 dark:text-neutral-700">
              —
            </span>
            <p className="font-mono text-xs font-bold text-neutral-400 uppercase">
              No Deliveries Yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {deliveries.map((d) => (
              <div
                key={d.id as string}
                className="flex items-center justify-between border-2 border-black bg-white p-2.5 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none dark:border-white dark:bg-black dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 border border-black ${d.status === "delivered" ? "bg-green-500" : "animate-pulse bg-red-500"}`}
                  />
                  <span className="truncate border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black uppercase dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                    {String(d.eventType ?? "")}
                  </span>
                  <span className="max-w-[100px] truncate text-neutral-500">
                    {String(d.apiKeyName ?? "")}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {d.responseStatus != null && (
                    <span
                      className={`border border-black px-1.5 py-0.5 text-[10px] font-black ${Number(d.responseStatus) < 300 ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}
                    >
                      HTTP {String(d.responseStatus)}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400">
                    {new Date(String(d.createdAt ?? "")).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && deliveries.length > 0 && !compact && (
          <div className="mt-3">
            <Pagination
              currentPage={page + 1}
              totalPages={hasMore ? page + 2 : page + 1}
              onPageChange={(p) => setPage(p - 1)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
