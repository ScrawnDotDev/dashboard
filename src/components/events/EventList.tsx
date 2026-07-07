import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { getFilteredEvents } from "@/lib/scrawn-server"
import { useCachedData } from "@/lib/useCache"
import { Pagination } from "@/components/ui/pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useProject } from "@/lib/ProjectContext"

interface EventListProps {
  apiKeyId?: string
  userId?: string
  eventType?: string
  mode?: string
  model?: string
  compact?: boolean
  showViewMore?: boolean
  pageSize?: number
  title?: string
}

export function EventList({
  apiKeyId,
  userId,
  eventType,
  mode,
  model,
  compact,
  showViewMore,
  pageSize = 8,
  title,
}: EventListProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { activeProjectId } = useProject()

  const { data, loading, error } = useCachedData(
    activeProjectId ? `events-list:${activeProjectId}:${apiKeyId ?? ""}:${userId ?? ""}:${eventType ?? ""}:${mode ?? ""}:${model ?? ""}:${page}` : `events-list:empty`,
    async () => {
      if (!activeProjectId) throw new Error("Waiting for active project...")
      return getFilteredEvents({ data: { projectId: activeProjectId, apiKeyId, userId, eventType, mode, model, limit: pageSize, offset: page * pageSize } })
    },
    30000
  )

  const events = (data as { rows: Array<Record<string, unknown>>; total: number } | null)?.rows ?? []
  const total = (data as { rows: Array<Record<string, unknown>>; total: number } | null)?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <Card className="border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <CardHeader className="pb-3 border-b-2 border-black dark:border-white">
        <CardTitle className="text-sm">{title ?? "Recent Events"}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading && !data ? (
          <div className={`w-full rounded-none border-2 border-black dark:border-white ${compact ? "h-[160px]" : "h-[300px]"}`} />
        ) : error ? (
          <p className="font-mono text-xs font-bold text-red-500">{error}</p>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="font-mono text-2xl text-neutral-300 dark:text-neutral-700">—</span>
            <p className="font-mono text-xs font-bold text-neutral-400 uppercase">No Events Yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((evt) => (
              <div
                key={evt.eventId as string}
                className="flex items-center justify-between border-2 border-black bg-white dark:bg-black p-2.5 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 text-[10px] uppercase truncate">
                    {String(evt.eventType ?? "")}
                  </span>
                  <span className="text-neutral-500 font-mono truncate max-w-[120px]">
                    {String(evt.userId ?? "").slice(0, 12)}...
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-black text-[#eab308]">
                    -{Number(evt.debitAmount ?? 0).toLocaleString()}
                  </span>
                  <span className="text-neutral-400 text-[10px]">
                    {String(evt.ingestedTimestamp ?? "").slice(0, 10)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && events.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            {!compact && <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={(p) => setPage(p - 1)} />}
            <div className={compact ? "ml-auto" : ""}>
              {showViewMore && (
                <button
                  onClick={() => navigate({ to: "/dashboard/events" })}
                  className="font-mono text-xs font-bold text-black underline underline-offset-2 hover:text-yellow-600 dark:text-white dark:hover:text-yellow-400"
                >
                  View More →
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
