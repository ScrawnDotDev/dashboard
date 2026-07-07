import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { listApiKeys } from "@/lib/scrawn-server"
import { EventFilters, type EventFiltersValue } from "@/components/events/EventFilters"
import { EventList } from "@/components/events/EventList"
import { Button } from "@/components/ui/button"
import { useCachedData, TTL } from "@/lib/useCache"
import { useMode } from "@/lib/ModeContext"

import { useProject } from "@/lib/ProjectContext"

export const Route = createFileRoute("/dashboard/events")({
  component: EventsPage,
})

const EVENT_TYPE_OPTIONS = ["BASIC_USAGE", "AI_TOKEN_USAGE"]

function EventsPage() {
  const [filters, setFilters] = useState<EventFiltersValue>({})
  const { mode, setMode } = useMode()
  const { activeProjectId } = useProject()
  const modeParam = mode === "all" ? undefined : mode
  const keys = useCachedData(
    activeProjectId ? `events-page-keys-${activeProjectId}` : "events-page-keys",
    async () => activeProjectId ? listApiKeys({ data: { projectId: activeProjectId } }) : { keys: [] },
    TTL.API_KEYS
  )

  const keysData = (keys.data as { keys: Array<Record<string, unknown>> } | null)?.keys ?? []
  const apiKeyOptions = keysData.map((k) => ({
    value: k.id as string,
    label: k.name as string,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
          Events
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFilters({})
              setMode("all")
            }}
          >
            RESET
          </Button>
        </div>
      </div>

      <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
        <EventFilters
          value={filters}
          onChange={setFilters}
          apiKeyOptions={apiKeyOptions}
          eventTypeOptions={EVENT_TYPE_OPTIONS}
          loading={keys.loading}
        />
      </div>

      <EventList
        apiKeyId={filters.apiKeyId}
        userId={filters.userId}
        eventType={filters.eventType}
        model={filters.model}
        mode={modeParam}
        pageSize={15}
        title="All Events"
      />
    </div>
  )
}
