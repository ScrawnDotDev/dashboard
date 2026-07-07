import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Key,
  Webhook,
  Settings,
  LogOut,
  RefreshCw,
  Folder,
  ChevronDown,
  FolderPlus,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { getBackendConfig } from "@/lib/scrawn-server"
import { clearDashboardSession } from "@/lib/server/cacheActions"
import {
  RefreshContext,
  useIsRefreshing,
  useOnlineStatus,
  hasAnyCachedData,
} from "@/lib/useCache"
import { ModeProvider } from "@/lib/ModeContext"
import { ProjectProvider, useProject } from "@/lib/ProjectContext"

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      {
        title: "Developer Console — Scrawn Usage-Based Metered Billing",
      },
      {
        name: "description",
        content:
          "Access your Scrawn billing console to view API event meters, manage developer access keys, configure webhooks, and track payment transactions.",
      },
      {
        name: "og:title",
        content: "Developer Console — Scrawn Usage-Based Metered Billing",
      },
      {
        name: "og:description",
        content:
          "Access your Scrawn billing console to view API event meters, manage developer access keys, configure webhooks, and track payment transactions.",
      },
      {
        name: "og:image",
        content: "/og.jpg",
      },
      {
        name: "twitter:title",
        content: "Developer Console — Scrawn Usage-Based Metered Billing",
      },
      {
        name: "twitter:description",
        content:
          "Access your Scrawn billing console to view API event meters, manage developer access keys, configure webhooks, and track payment transactions.",
      },
      {
        name: "twitter:image",
        content: "/og.jpg",
      },
    ],
  }),
  component: DashboardLayout,
})

const navItems = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { path: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { path: "/dashboard/projects", label: "Projects", icon: FolderPlus },
  { path: "/dashboard/settings", label: "Settings", icon: Settings },
]

function ProjectSelector({ expanded }: { expanded: boolean }) {
  const { activeProjectId, setActiveProjectId, projects, loading, error, refreshProjects } =
    useProject()

  if (loading) return null

  if (error) {
    return (
      <button
        onClick={refreshProjects}
        className={`group relative mb-2 flex h-10 w-full shrink-0 items-center overflow-hidden transition-all border-2 border-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40`}
      >
        <div className="flex w-11 shrink-0 items-center justify-center">
          <RefreshCw className="h-4 w-4 text-red-500" />
        </div>
        {expanded && (
          <div className="flex-1 overflow-hidden pr-3 text-left whitespace-nowrap">
            <span className="font-mono text-[10px] font-bold text-red-500">RETRY LOAD</span>
          </div>
        )}
      </button>
    )
  }

  if (projects.length === 0) return null

  return (
    <div
      className={`group relative mb-2 flex h-10 w-full shrink-0 items-center overflow-hidden transition-all ${
        expanded
          ? "border-2 border-black bg-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-neutral-900 dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
          : "justify-center border-2 border-white bg-transparent"
      }`}
    >
      <div
        className={`flex w-11 shrink-0 items-center justify-center ${expanded ? "h-full border-r-2 border-black bg-neutral-700/50 dark:border-white dark:bg-neutral-800/50" : ""}`}
      >
        <Folder className="h-4 w-4 text-gray-400 transition-colors group-hover:text-white" />
      </div>
      <motion.div
        animate={{ width: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 overflow-hidden"
      >
        <select
          value={activeProjectId || ""}
          onChange={(e) => setActiveProjectId(e.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent px-3 py-2 font-mono text-[10px] font-bold text-white uppercase outline-none"
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              PROJ {p.slice(0, 8)}
            </option>
          ))}
        </select>
      </motion.div>
      {expanded && (
        <div className="pointer-events-none flex items-center justify-center pr-3">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      )}
    </div>
  )
}

function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const refreshing = useIsRefreshing()
  const online = useOnlineStatus()
  const [signingOut, setSigningOut] = useState(false)
  const [checkingConfig, setCheckingConfig] = useState(true)

  const triggerRefresh = useMemo(
    () => () => setRefreshVersion((v) => v + 1),
    []
  )
  const refreshValue = useMemo(
    () => ({ version: refreshVersion, triggerRefresh }),
    [refreshVersion, triggerRefresh]
  )

  // Check onboarding before rendering dashboard
  useEffect(() => {
    if (isPending) return
    if (!session) {
      setCheckingConfig(false)
      return
    }
    getBackendConfig()
      .then((res) => {
        if (!res.configured) {
          navigate({ to: "/onboarding", replace: true })
        } else {
          setCheckingConfig(false)
        }
      })
      .catch(() => setCheckingConfig(false))
  }, [session, isPending])

  // Preload all sidebar routes once config confirms
  useEffect(() => {
    if (checkingConfig) return
    const routes = [
      "/dashboard",
      "/dashboard/api-keys",
      "/dashboard/projects",
      "/dashboard/settings",
      "/dashboard/webhooks",
    ]
    routes.forEach((path) => router.preloadRoute({ to: path }))
  }, [checkingConfig])

  // Re-fetch all data when browser comes back online
  useEffect(() => {
    window.addEventListener("online", triggerRefresh)
    return () => window.removeEventListener("online", triggerRefresh)
  }, [triggerRefresh])

  useEffect(() => {
    if (!isPending && !checkingConfig && !session && !signingOut) {
      navigate({ to: "/sign-in", replace: true })
    }
  }, [isPending, checkingConfig, session, signingOut, navigate])

  if (isPending || checkingConfig) return null
  if (!session && !signingOut) return null

  return (
    <ProjectProvider>
      <RefreshContext.Provider value={refreshValue}>
        <div className="relative flex h-svh">
          {refreshing && (
            <div className="fixed top-0 left-0 z-50 h-0.5 w-full overflow-hidden bg-transparent">
              <div
                className="h-full w-full animate-pulse bg-yellow-500"
                style={{ animationDuration: "1.5s" }}
              />
            </div>
          )}
          <div className="sticky top-0 z-40 flex h-svh flex-col justify-center overflow-visible bg-transparent py-3 pl-3">
            <motion.aside
              layout
              onMouseEnter={() => setExpanded(true)}
              onMouseLeave={() => setExpanded(false)}
              initial={{ width: "4rem" }}
              animate={{ width: expanded ? "14rem" : "4rem" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex h-full flex-col overflow-x-hidden overflow-y-auto border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            >
              <div className="flex h-16 shrink-0 items-center gap-2 px-4">
                <img
                  src="/Scrawn_Logo.png"
                  alt="Scrawn Logo"
                  className="h-8 w-8 shrink-0 border-2 border-black bg-white object-contain p-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black"
                />
                <motion.div
                  layout
                  animate={{
                    width: expanded ? "auto" : 0,
                    opacity: expanded ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="ml-1 overflow-hidden whitespace-nowrap"
                >
                  <span className="block rotate-[-2deg] border-2 border-black bg-yellow-400 px-2 py-0.5 font-mono text-sm font-black tracking-widest text-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-yellow-500 dark:text-black">
                    SCRAWN
                  </span>
                </motion.div>
              </div>
              <nav className="mt-4 flex flex-col gap-2 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    item.path === "/dashboard"
                      ? location.pathname === "/dashboard" ||
                        location.pathname === "/dashboard/events"
                      : location.pathname === item.path ||
                        location.pathname.startsWith(item.path + "/")
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate({ to: item.path })}
                      className={`group relative flex h-10 shrink-0 items-center overflow-hidden rounded-none text-left text-sm font-bold transition-all ${
                        isActive
                          ? "translate-x-[-1px] translate-y-[-1px] border-2 border-black bg-yellow-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-yellow-500 dark:text-black dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                          : "border-2 border-transparent text-gray-500 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-black hover:bg-neutral-100 hover:text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:border-white dark:hover:bg-neutral-900 dark:hover:text-white dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                      }`}
                    >
                      <div className="flex w-11 shrink-0 items-center justify-center">
                        <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                      </div>
                      <motion.div
                        animate={{
                          width: expanded ? "auto" : 0,
                          opacity: expanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-hidden whitespace-nowrap"
                      >
                        <span>{item.label}</span>
                      </motion.div>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-auto flex flex-col gap-2 p-2">
                {/* Session info profile widget */}
                <div
                  className={`flex items-center overflow-hidden transition-all duration-200 ${
                    expanded
                      ? "justify-start gap-2 border-2 border-black bg-neutral-50 p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-800 dark:bg-neutral-900/50 dark:shadow-none"
                      : "w-full justify-center border-2 border-transparent bg-transparent p-0"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-yellow-400 font-mono text-sm font-black text-black uppercase dark:border-white dark:bg-yellow-500">
                    {session?.user?.email
                      ? session.user.email.slice(0, 2)
                      : "OP"}
                  </div>
                  <motion.div
                    animate={{
                      width: expanded ? "auto" : 0,
                      opacity: expanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex min-w-0 flex-1 flex-col overflow-hidden whitespace-nowrap"
                  >
                    <p className="truncate font-mono text-xs leading-tight font-bold text-black uppercase dark:text-white">
                      {session?.user?.name || "Developer"}
                    </p>
                    <span className="truncate font-mono text-[9px] leading-tight text-gray-400">
                      {session?.user?.email}
                    </span>
                  </motion.div>
                </div>

                <ProjectSelector expanded={expanded} />

                <button
                  onClick={() => setRefreshVersion((v) => v + 1)}
                  disabled={refreshing}
                  className="group flex h-10 w-full shrink-0 items-center overflow-hidden border-2 border-black bg-[#38bdf8] font-mono text-xs font-black tracking-widest text-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 dark:border-white dark:bg-[#38bdf8] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                >
                  <div className="flex w-11 shrink-0 items-center justify-center">
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? "animate-spin text-red-600" : ""}`}
                    />
                  </div>
                  <motion.div
                    animate={{
                      width: expanded ? "auto" : 0,
                      opacity: expanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pr-3 text-left whitespace-nowrap"
                  >
                    REFRESH
                  </motion.div>
                </button>

                <button
                  onClick={async () => {
                    setSigningOut(true)
                    try {
                      await clearDashboardSession()
                    } catch (e) {
                      console.error("Failed to clear dashboard session", e)
                    }
                    authClient.signOut().then(() => {
                      window.location.href = "/sign-in"
                    })
                  }}
                  className="group mt-2 flex h-10 w-full shrink-0 items-center overflow-hidden border-2 border-black bg-red-500 font-mono text-xs font-black tracking-widest text-white uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                >
                  <div className="flex w-11 shrink-0 items-center justify-center">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <motion.div
                    animate={{
                      width: expanded ? "auto" : 0,
                      opacity: expanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pr-3 text-left whitespace-nowrap"
                  >
                    NUKE SESSION
                  </motion.div>
                </button>
              </div>
            </motion.aside>
          </div>
          <main className="relative flex-1 overflow-auto p-6">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/potentialbackground.png')] bg-[length:1200px_auto] bg-top opacity-[0.04] md:bg-cover md:bg-center md:bg-no-repeat dark:opacity-[0.08] dark:invert" />
            {/* Decorative Crosshairs */}
            <div className="pointer-events-none absolute top-10 left-10 z-0 hidden font-mono text-xl font-black text-gray-200 md:block dark:text-gray-800">
              +
            </div>
            <div className="pointer-events-none absolute top-10 right-10 hidden font-mono text-xl font-black text-gray-200 md:block dark:text-gray-800">
              +
            </div>

            <div className="relative z-10">
              {!online && (
                <div className="mb-4 flex items-center gap-3 border-2 border-black bg-red-500 px-4 py-2.5 font-mono text-xs font-black text-white uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  <span>
                    {hasAnyCachedData()
                      ? "Offline — Using Cache — Reconnecting..."
                      : "Offline — No Cache"}
                  </span>
                </div>
              )}
              <ModeProvider>
                <Outlet />
              </ModeProvider>
            </div>
          </main>
        </div>
      </RefreshContext.Provider>
    </ProjectProvider>
  )
}
