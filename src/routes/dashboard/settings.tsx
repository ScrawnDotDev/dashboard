import { useState, useCallback, useContext } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  listTags,
  createTag,
  deleteTag,
  listExpressions,
  createExpression,
  deleteExpression,
} from "@/lib/scrawn-server"
import { TTL, useCachedData, RefreshContext, invalidateCache } from "@/lib/useCache"
import { ExpressionBuilder } from "@/components/ExpressionBuilder"
import { useProject } from "@/lib/ProjectContext"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useTheme } from "@/lib/theme-provider"

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      {
        title: "Console Settings | Scrawn Configuration",
      },
      {
        name: "description",
        content: "Configure subscription billing tags, develop custom pricing expressions, switch console theme aesthetics, and view workspace credentials.",
      },
      {
        name: "og:title",
        content: "Console Settings | Scrawn Configuration",
      },
      {
        name: "og:description",
        content: "Configure subscription billing tags, develop custom pricing expressions, switch console theme aesthetics, and view workspace credentials.",
      },
      {
        name: "og:image",
        content: "/og.jpg",
      },
      {
        name: "twitter:title",
        content: "Console Settings | Scrawn Configuration",
      },
      {
        name: "twitter:description",
        content: "Configure subscription billing tags, develop custom pricing expressions, switch console theme aesthetics, and view workspace credentials.",
      },
      {
        name: "twitter:image",
        content: "/og.jpg",
      },
    ],
  }),
  component: SettingsPage,
})

type TagItem = string | { key: string; amount?: number }

function SettingsPage() {
  const { activeProjectId } = useProject()

  const tags = useCachedData(
    activeProjectId ? `tags-${activeProjectId}` : "tags",
    async () => activeProjectId ? listTags({ data: { projectId: activeProjectId } }) : { tags: [] },
    TTL.TAGS
  )
  const exprs = useCachedData(
    activeProjectId ? `expressions-${activeProjectId}` : "expressions",
    async () => activeProjectId ? listExpressions({ data: { projectId: activeProjectId } }) : { expressions: [] },
    TTL.EXPRESSIONS
  )
  const rawTags = (tags.data as { tags: TagItem[] } | null)?.tags ?? []
  const tagList = rawTags.map((t) => (typeof t === "string" ? t : t.key))
  const exprList =
    (exprs.data as { expressions: string[] } | null)?.expressions ?? []
  const { triggerRefresh } = useContext(RefreshContext)
  const { theme, setTheme } = useTheme()

  const [newTagKey, setNewTagKey] = useState("")
  const [newTagAmount, setNewTagAmount] = useState("")
  const [exprError, setExprError] = useState<string | null>(null)
  const [tagError, setTagError] = useState("")
  const [creatingTag, setCreatingTag] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null)
  const [deletingExpr, setDeletingExpr] = useState<string | null>(null)
  const [confirmDeleteExpr, setConfirmDeleteExpr] = useState<string | null>(null)

  const refreshAll = useCallback(() => {
    if (activeProjectId) {
      invalidateCache(`tags-${activeProjectId}`)
      invalidateCache(`expressions-${activeProjectId}`)
      triggerRefresh()
    }
  }, [triggerRefresh, activeProjectId])

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault()
    setTagError("")
    setCreatingTag(true)
    try {
      if (!activeProjectId) throw new Error("No active project")
      await createTag({
        data: { projectId: activeProjectId, key: newTagKey, amount: parseInt(newTagAmount) || 0 },
      })
      setNewTagKey("")
      setNewTagAmount("")
      await refreshAll()
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Failed")
    } finally {
      setCreatingTag(false)
    }
  }

  async function handleDeleteTag(key: string) {
    setDeletingTag(key)
    try {
      if (!activeProjectId) return
      await deleteTag({ data: { projectId: activeProjectId, key } })
      await refreshAll()
    } catch {
    } finally {
      setDeletingTag(null)
    }
  }

  async function handleAddExpr(key: string, expr: string) {
    setExprError(null)
    try {
      if (!activeProjectId) throw new Error("No active project")
      await createExpression({ data: { projectId: activeProjectId, key, expr } })
      await refreshAll()
    } catch (err) {
      setExprError(
        err instanceof Error ? err.message : "Failed to save expression"
      )
    }
  }

  async function handleDeleteExpr(key: string) {
    setDeletingExpr(key)
    try {
      if (!activeProjectId) return
      await deleteExpression({ data: { projectId: activeProjectId, key } })
      await refreshAll()
    } catch {
    } finally {
      setDeletingExpr(null)
    }
  }

  function getTagAmount(key: string): number | null {
    for (const t of rawTags) {
      if (typeof t === "object" && t.key === key) return t.amount ?? null
    }
    return null
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-2xl font-black tracking-widest text-black uppercase dark:text-white">
            Settings
          </h1>

          <div className="flex border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 py-2 font-mono text-xs font-black uppercase transition-colors ${theme === t ? "bg-black text-white dark:bg-white dark:text-black" : "text-neutral-500 hover:bg-neutral-100 hover:text-black dark:hover:bg-neutral-900 dark:hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={refreshAll}>
          REFRESH
        </Button>
      </div>

      <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="mb-4 border-b-2 border-black dark:border-white pb-3 flex items-center justify-between">
          <h2 className="font-mono text-xl font-black text-black uppercase dark:text-white">
            TAGS
          </h2>
          <span className="font-mono text-xs text-neutral-400 font-bold">+</span>
        </div>
        <form onSubmit={handleAddTag} className="mb-6 flex gap-2">
          <input
            value={newTagKey}
            onChange={(e) =>
              setNewTagKey(
                e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")
              )
            }
            placeholder="TAG_NAME"
            required
            className="flex-1 border-2 border-black bg-white px-3 py-2 text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:border-white"
          />
          <input
            value={newTagAmount}
            onChange={(e) => setNewTagAmount(e.target.value)}
            placeholder="AMOUNT"
            required
            type="number"
            className="w-32 border-2 border-black bg-white px-3 py-2 text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:border-white"
          />
          <Button type="submit" disabled={creatingTag} className="h-auto py-2">
            {creatingTag ? "ADDING..." : "ADD TAG"}
          </Button>
        </form>
        {tagError && (
          <p className="mb-4 border-2 border-red-500 bg-white px-2 py-1 font-mono text-sm font-bold text-red-600 dark:bg-black">
            {tagError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {tagList.map((key, i) => {
            const amount = getTagAmount(key)
            const deleting = deletingTag === key
            return (
              <div
                key={key}
                className={`flex items-center gap-3 border-2 border-black bg-yellow-400 py-1 pr-1 pl-3 font-mono text-sm font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-yellow-500 ${i % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"}`}
              >
                <span>
                  {key}
                  {amount !== null ? ` : ${amount}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTag(key)}
                  disabled={deleting}
                  className="bg-black px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-red-600 dark:hover:text-white"
                >
                  {deleting ? "..." : "X"}
                </button>
              </div>
            )
          })}
          {tagList.length === 0 && (
            <p className="text-sm text-gray-500">
              NO TAGS FOUND
            </p>
          )}
        </div>
      </section>

      <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="mb-4 border-b-2 border-black dark:border-white pb-3 flex items-center justify-between">
          <h2 className="font-mono text-xl font-black text-black uppercase dark:text-white">
            EXPRESSIONS
          </h2>
          <span className="font-mono text-xs text-neutral-400 font-bold">+</span>
        </div>
        <div className="mb-6">
          <ExpressionBuilder
            tags={tagList}
            expressions={exprList}
            onError={setExprError}
            onSaveExpression={handleAddExpr}
          />
        </div>
        {exprError && (
          <p className="mb-4 border-2 border-red-500 bg-white px-2 py-1 font-mono text-sm font-bold text-red-600 dark:bg-black">
            {exprError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {exprList.map((e, i) => {
            const deleting = deletingExpr === e
            return (
              <div
                key={e}
                className={`flex items-center gap-3 border-2 border-black bg-yellow-400 py-1 pr-1 pl-3 font-mono text-sm font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white ${i % 2 === 0 ? "rotate-[1deg]" : "rotate-[-1deg]"}`}
              >
                <span>{e}</span>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteExpr(e)}
                  disabled={deleting}
                  className="bg-black px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-red-600 dark:hover:text-white"
                >
                  {deleting ? "..." : "X"}
                </button>
              </div>
            )
          })}
          {exprList.length === 0 && (
            <p className="text-sm text-gray-500">
              NO EXPRESSIONS FOUND
            </p>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmDeleteTag !== null}
        title="Delete Tag"
        message="This will permanently delete this tag and its associated data."
        confirmText="DELETE"
        matchValue={confirmDeleteTag ?? ""}
        onConfirm={() => {
          if (confirmDeleteTag) handleDeleteTag(confirmDeleteTag)
          setConfirmDeleteTag(null)
        }}
        onCancel={() => setConfirmDeleteTag(null)}
        loading={deletingTag !== null}
      />

      <ConfirmDialog
        open={confirmDeleteExpr !== null}
        title="Delete Expression"
        message="This will permanently delete this expression."
        confirmText="DELETE"
        matchValue={confirmDeleteExpr ?? ""}
        onConfirm={() => {
          if (confirmDeleteExpr) handleDeleteExpr(confirmDeleteExpr)
          setConfirmDeleteExpr(null)
        }}
        onCancel={() => setConfirmDeleteExpr(null)}
        loading={deletingExpr !== null}
      />
    </div>
  )
}
