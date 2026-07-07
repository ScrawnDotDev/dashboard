import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Folder,
  Key,
  Lock,
  Coins,
  Globe,
  ShieldAlert,
  ArrowRight,
  Trash2,
  Edit2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  submitOnboarding,
  listProjectConfigs,
  updateProject,
  deleteProject,
} from "@/lib/scrawn-server"
import { authClient } from "@/lib/auth-client"
import { useProject } from "@/lib/ProjectContext"
import { useCachedData, TTL } from "@/lib/useCache"

export const Route = createFileRoute("/dashboard/projects")({
  head: () => ({
    meta: [
      {
        title: "Manage Projects | Scrawn",
      },
    ],
  }),
  component: ProjectsPage,
})

function ProjectsPage() {
  const { data: session } = authClient.useSession()
  const { projects: _projects } = useProject()

  const {
    data: configsData,
    loading: loadingConfigs,
    refresh,
  } = useCachedData(
    session?.user?.id
      ? `project-configs:${session.user.id}`
      : "project-configs-loading",
    listProjectConfigs,
    TTL.DASHBOARD_SUMMARY
  )
  const projectsList = (configsData as any)?.projects || []

  const [mode, setMode] = useState<"create" | "edit">("create")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  )

  const [name, setName] = useState("")
  const [dodoLiveApiKey, setDodoLiveApiKey] = useState("")
  const [dodoTestApiKey, setDodoTestApiKey] = useState("")
  const [dodoLiveProductId, setDodoLiveProductId] = useState("")
  const [dodoTestProductId, setDodoTestProductId] = useState("")
  const [currency, setCurrency] = useState("usd")
  const [redirectUrl, setRedirectUrl] = useState("")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)

  function resetForm() {
    setName("")
    setDodoLiveApiKey("")
    setDodoTestApiKey("")
    setCurrency("usd")
    setRedirectUrl("")
    setError("")
    setSuccess(false)
  }

  function handleCreateNew() {
    setMode("create")
    setSelectedProjectId(null)
    resetForm()
  }

  function handleSelectProject(proj: any) {
    setMode("edit")
    setSelectedProjectId(proj.id)
    setName(proj.name || "")
    setDodoLiveApiKey(proj.dodoLiveApiKey || "")
    setDodoTestApiKey(proj.dodoTestApiKey || "")
    setDodoLiveProductId(proj.dodoLiveProductId || "")
    setDodoTestProductId(proj.dodoTestProductId || "")
    setCurrency(proj.currency || "usd")
    setRedirectUrl(proj.redirectUrl || "")
    setError("")
    setSuccess(false)
  }

  async function handleDelete(projectId: string) {
    if (
      !confirm(
        "Are you absolutely sure you want to delete this project? This will erase all events, metrics, and API keys permanently!"
      )
    )
      return

    setDeleteLoading(true)
    try {
      const res = await deleteProject({ data: { projectId } })
      if (res.error) {
        alert(res.error)
      } else {
        alert("Project deleted successfully.")
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete project")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) return

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      if (mode === "create") {
        const res = await submitOnboarding({
          data: {
            name,
            dodoLiveApiKey,
            dodoTestApiKey,
            currency,
            redirectUrl,
          },
        })

        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        setSuccess(true)
        setTimeout(() => window.location.reload(), 1000)
      } else if (mode === "edit" && selectedProjectId) {
        const res = await updateProject({
          data: {
            projectId: selectedProjectId,
            name,
            dodoLiveApiKey,
            dodoTestApiKey,
            dodoLiveProductId,
            dodoTestProductId,
            currency,
            redirectUrl,
          },
        })

        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        setSuccess(true)
        refresh()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} project`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:items-start">
      {/* Editor */}
      <div className="flex w-full flex-col gap-6 lg:flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
              {mode === "create" ? "Create Project" : "Edit Project"}
            </h1>
            <span
              className={`rotate-[1deg] border-2 border-black px-2 py-0.5 font-mono text-xs font-black text-white uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white ${mode === "create" ? "bg-[#ff00ff]" : "bg-blue-500"}`}
            >
              {mode === "create" ? "New" : "Config"}
            </span>
          </div>
        </div>

        <div className="w-full border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-card dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {/* Project Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                  Project Name
                </label>
                <div className="relative flex items-center">
                  <Folder className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Scrawn Project"
                    required
                    className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Live API Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                    Dodo Live API Key
                  </label>
                  <div className="relative flex items-center">
                    <Key className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                    <input
                      type="password"
                      value={dodoLiveApiKey}
                      onChange={(e) => setDodoLiveApiKey(e.target.value)}
                      placeholder="XCmeKyWvG1-..."
                      required={mode === "create"}
                      className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                    />
                  </div>
                </div>

                {/* Test API Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                    Dodo Test API Key
                  </label>
                  <div className="relative flex items-center">
                    <Key className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                    <input
                      type="password"
                      value={dodoTestApiKey}
                      onChange={(e) => setDodoTestApiKey(e.target.value)}
                      placeholder="XCmeKyWvG1-..."
                      required={mode === "create"}
                      className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                    />
                  </div>
                </div>

                {/* Product IDs (Edit only) */}
                {mode === "edit" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Dodo Live Product ID
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <input
                          type="text"
                          value={dodoLiveProductId}
                          onChange={(e) => setDodoLiveProductId(e.target.value)}
                          placeholder="pdt_..."
                          required
                          className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Dodo Test Product ID
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <input
                          type="text"
                          value={dodoTestProductId}
                          onChange={(e) => setDodoTestProductId(e.target.value)}
                          placeholder="pdt_..."
                          required
                          className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Currency */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                    Currency
                  </label>
                  <div className="relative flex items-center">
                    <Coins className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] dark:border-white dark:bg-black dark:text-white"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                      <option value="inr">INR</option>
                      <option value="jpy">JPY</option>
                    </select>
                  </div>
                </div>

                {/* Redirect URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                    Redirect URL
                  </label>
                  <div className="relative flex items-center">
                    <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                    <input
                      type="url"
                      value={redirectUrl}
                      onChange={(e) => setRedirectUrl(e.target.value)}
                      placeholder="https://app.scrawn.dev"
                      required
                      className="w-full border-2 border-black bg-white py-2 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 border-2 border-red-500 bg-red-50 p-3 dark:bg-red-950/20">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  Error: {error}
                </span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 border-2 border-green-500 bg-green-50 p-3 dark:bg-green-950/20">
                <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400">
                  {mode === "create"
                    ? "Success! Project created. Reloading..."
                    : "Success! Project updated."}
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (mode === "create" && success)}
              variant={mode === "create" ? "fuchsia" : "cyan"}
              className={`mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 border-2 border-black font-mono text-sm font-black tracking-widest uppercase dark:border-white`}
            >
              {loading
                ? "Saving..."
                : mode === "create" && success
                  ? "Created!"
                  : mode === "create"
                    ? "Create Project"
                    : "Update Project"}
              {mode === "create" ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <Edit2 className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Sidebar List */}
      <div className="flex w-full shrink-0 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xl font-black text-black uppercase dark:text-white">
            Your Projects
          </h2>
          <Button
            size="sm"
            onClick={handleCreateNew}
            variant={mode === "create" ? "fuchsia" : "secondary"}
            className="flex items-center gap-1 border-2 border-black font-mono font-bold dark:border-white"
          >
            <Plus className="h-4 w-4" /> NEW
          </Button>
        </div>

        {loadingConfigs ? (
          <p className="font-mono text-sm text-gray-500">Loading projects...</p>
        ) : projectsList.length === 0 ? (
          <div className="border-2 border-black p-4 text-center font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            No projects found. Create one!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projectsList.map((proj: any) => (
              <div
                key={proj.id}
                className={`flex items-center justify-between border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ${mode === "edit" && selectedProjectId === proj.id ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-white dark:bg-black"} cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900`}
                onClick={() => handleSelectProject(proj)}
              >
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-black text-black uppercase dark:text-white">
                    {proj.name}
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    {proj.id.slice(0, 8)}...
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(proj.id)
                  }}
                  disabled={deleteLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
