import { createFileRoute } from "@tanstack/react-router"
import {
  getAiTokenUsage,
  getDashboardSummary,
  getPaymentHistory,
  getUsageOverTime,
} from "@/lib/scrawn-server"
import { TTL, useCachedData } from "@/lib/useCache"
import { useMode } from "@/lib/ModeContext"
import { useProject } from "@/lib/ProjectContext"
import { UsageOverTime } from "@/components/analytics/usage-over-time"
import { AiTokenUsage } from "@/components/analytics/ai-token-usage"
import { PaymentHistory } from "@/components/analytics/payment-history"
import { EventList } from "@/components/events/EventList"
import { WebhookList } from "@/components/webhooks/WebhookList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      {
        title: "Dashboard Overview | Scrawn Usage-Based Billing",
      },
      {
        name: "description",
        content:
          "Inspect your live usage-based billing logs, track API token consumption metrics by model, analyze event history, and audit credits collected in real-time.",
      },
      {
        name: "og:title",
        content: "Dashboard Overview | Scrawn Usage-Based Billing",
      },
      {
        name: "og:description",
        content:
          "Inspect your live usage-based billing logs, track API token consumption metrics by model, analyze event history, and audit credits collected in real-time.",
      },
      {
        name: "og:image",
        content: "/og.jpg",
      },
      {
        name: "twitter:title",
        content: "Dashboard Overview | Scrawn Usage-Based Billing",
      },
      {
        name: "twitter:description",
        content:
          "Inspect your live usage-based billing logs, track API token consumption metrics by model, analyze event history, and audit credits collected in real-time.",
      },
      {
        name: "twitter:image",
        content: "/og.jpg",
      },
    ],
  }),
  component: DashboardHome,
})

// Helper to provide premium 3D stacked shadow borders
function StackedWrapper({
  children,
  className = "",
  stretch = false,
}: {
  children: React.ReactNode
  className?: string
  stretch?: boolean
}) {
  return (
    <div
      className={`relative ${stretch ? "flex h-full flex-col" : ""} ${className}`}
    >
      {/* Offset background panel */}
      <div
        className={`absolute border-2 border-black bg-neutral-100 dark:border-white dark:bg-black ${
          stretch
            ? "top-1.5 -right-1.5 bottom-1.5 left-1.5"
            : "top-1.5 -right-1.5 -bottom-1.5 left-1.5 h-full w-full"
        }`}
      />
      <div
        className={`relative z-10 ${
          stretch
            ? "flex h-full flex-1 flex-col [&>*]:flex [&>*]:h-full [&>*]:flex-1 [&>*]:flex-col"
            : ""
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function DashboardHome() {
  const { mode, setMode } = useMode()
  const { activeProjectId } = useProject()

  const modeParam = mode === "all" ? undefined : mode

  const summary = useCachedData(
    activeProjectId ? `summary:${activeProjectId}:${mode}` : `summary:${mode}`,
    async () => {
      if (!activeProjectId) throw new Error("Waiting for active project...")
      return getDashboardSummary({ data: { projectId: activeProjectId, mode: modeParam } })
    },
    TTL.DASHBOARD_SUMMARY
  )
  const usage = useCachedData(
    activeProjectId ? `usage-over-time:${activeProjectId}:${mode}` : `usage-over-time:${mode}`,
    async () => {
      if (!activeProjectId) throw new Error("Waiting for active project...")
      return getUsageOverTime({ data: { projectId: activeProjectId, mode: modeParam } })
    },
    TTL.USAGE_OVER_TIME
  )
  const payments = useCachedData(
    activeProjectId ? `payment-history:${activeProjectId}:${mode}` : `payment-history:${mode}`,
    async () => {
      if (!activeProjectId) throw new Error("Waiting for active project...")
      return getPaymentHistory({ data: { projectId: activeProjectId, mode: modeParam } })
    },
    TTL.PAYMENT_HISTORY
  )
  const ai = useCachedData(
    activeProjectId ? `ai-token-usage:${activeProjectId}:${mode}` : `ai-token-usage:${mode}`,
    async () => {
      if (!activeProjectId) throw new Error("Waiting for active project...")
      return getAiTokenUsage({ data: { projectId: activeProjectId, mode: modeParam } })
    },
    TTL.AI_TOKEN_USAGE
  )

  const errors: Array<string> = [
    summary.error,
    usage.error,
    payments.error,
    ai.error,
  ].filter((e): e is string => e !== null)

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="w-max border border-black bg-yellow-400 px-2 py-0.5 font-mono text-[9px] font-black tracking-widest text-black uppercase dark:border-white dark:bg-yellow-500">
            // METRIC DATA CENTER
          </div>
          <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
            Overview
          </h1>
        </div>

        {/* Selection Segments */}
        <div className="flex self-start border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:self-auto dark:border-white dark:bg-black dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          {(["all", "test", "production"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase transition-colors ${
                mode === m
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-gray-500 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-1 border-2 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-black tracking-widest text-red-600 uppercase dark:text-red-400">
              // FETCH ERROR{errors.length > 1 ? `S (${errors.length})` : ""}
            </span>
          </div>
          {errors.map((err, i) => (
            <p
              key={i}
              className="font-mono text-xs leading-relaxed text-red-700 dark:text-red-300"
            >
              {err}
            </p>
          ))}
          <button
            onClick={() => summary.refresh()}
            className="mt-1 self-start border border-red-400 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-red-600 uppercase hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {summary.loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StackedWrapper stretch key={i}>
              <Skeleton className="h-[110px] w-full rounded-none border-2 border-black dark:border-white" />
            </StackedWrapper>
          ))}
        </div>
      ) : summary.error ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StackedWrapper stretch key={i}>
              <div className="flex h-full w-full items-center justify-center border-2 border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950">
                <p className="px-4 font-mono text-xs leading-relaxed text-red-600 dark:text-red-400">
                  {summary.error}
                </p>
              </div>
            </StackedWrapper>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StackedWrapper stretch>
            <Card className="border-x-2 border-t-4 border-b-2 border-black border-t-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader className="flex-row items-start justify-between pb-2">
                <CardTitle className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  Total Revenue
                </CardTitle>
                <span className="font-mono text-xs font-bold text-neutral-400">
                  +
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-black text-black tabular-nums dark:text-white">
                  {Number(summary.data?.totalRevenue ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-widest text-neutral-400 uppercase">
                  Smallest Currency Unit
                </p>
              </CardContent>
            </Card>
          </StackedWrapper>

          <StackedWrapper stretch>
            <Card className="border-x-2 border-t-4 border-b-2 border-black border-t-[#ff00ff] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader className="flex-row items-start justify-between pb-2">
                <CardTitle className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  Total Events
                </CardTitle>
                <span className="font-mono text-xs font-bold text-neutral-400">
                  +
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-black text-black tabular-nums dark:text-white">
                  {Number(summary.data?.totalEvents ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-widest text-neutral-400 uppercase">
                  Metered SDK Events
                </p>
              </CardContent>
            </Card>
          </StackedWrapper>

          <StackedWrapper stretch>
            <Card className="border-x-2 border-t-4 border-b-2 border-black border-t-[#38bdf8] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader className="flex-row items-start justify-between pb-2">
                <CardTitle className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  Total Credits
                </CardTitle>
                <span className="font-mono text-xs font-bold text-neutral-400">
                  +
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-black text-black tabular-nums dark:text-white">
                  {Number(summary.data?.totalCredits ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-widest text-neutral-400 uppercase">
                  Smallest Currency Unit
                </p>
              </CardContent>
            </Card>
          </StackedWrapper>
        </div>
      )}

      {usage.loading ? (
        <StackedWrapper>
          <Skeleton className="h-[300px] w-full rounded-none border-2 border-black dark:border-white" />
        </StackedWrapper>
      ) : usage.error ? (
        <StackedWrapper>
          <div className="flex h-[300px] w-full items-center justify-center border-2 border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950">
            <p className="px-4 font-mono text-xs leading-relaxed text-red-600 dark:text-red-400">
              {usage.error}
            </p>
          </div>
        </StackedWrapper>
      ) : (
        <StackedWrapper>
          <UsageOverTime data={usage.data ?? []} />
        </StackedWrapper>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StackedWrapper stretch>
          <EventList compact showViewMore mode={modeParam} />
        </StackedWrapper>
        {ai.loading ? (
          <StackedWrapper stretch>
            <Skeleton className="h-[300px] w-full rounded-none border-2 border-black dark:border-white" />
          </StackedWrapper>
        ) : ai.error ? (
          <StackedWrapper stretch>
            <div className="flex h-full w-full items-center justify-center border-2 border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950">
              <p className="px-4 font-mono text-xs leading-relaxed text-red-600 dark:text-red-400">
                {ai.error}
              </p>
            </div>
          </StackedWrapper>
        ) : (
          <StackedWrapper stretch>
            <AiTokenUsage data={ai.data ?? { input: [], output: [] }} />
          </StackedWrapper>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StackedWrapper stretch>
          <WebhookList compact role={modeParam} />
        </StackedWrapper>
        {payments.loading ? (
          <StackedWrapper stretch>
            <Skeleton className="h-[300px] w-full rounded-none border-2 border-black dark:border-white" />
          </StackedWrapper>
        ) : payments.error ? (
          <StackedWrapper stretch>
            <div className="flex h-full w-full items-center justify-center border-2 border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950">
              <p className="px-4 font-mono text-xs leading-relaxed text-red-600 dark:text-red-400">
                {payments.error}
              </p>
            </div>
          </StackedWrapper>
        ) : (
          <StackedWrapper stretch>
            <PaymentHistory data={payments.data ?? []} />
          </StackedWrapper>
        )}
      </div>
    </div>
  )
}
