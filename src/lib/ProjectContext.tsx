import React, { createContext, useContext, useState, useEffect } from "react"
import { listProjects } from "./scrawn-server"

interface ProjectContextType {
  activeProjectId: string | null
  setActiveProjectId: (id: string) => void
  projects: string[]
  loading: boolean
  error: boolean
  refreshProjects: () => void
}

const ProjectContext = createContext<ProjectContextType>({
  activeProjectId: null,
  setActiveProjectId: () => {},
  projects: [],
  loading: true,
  error: false,
  refreshProjects: () => {},
})

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refreshProjects = () => {
    setLoading(true)
    setError(false)
    listProjects()
      .then((projIds) => {
        setProjects(projIds)
        setLoading(false)
        if (projIds.length > 0) {
          setActiveProjectId((current) =>
            current && projIds.includes(current) ? current : projIds[0]
          )
        } else {
          setActiveProjectId(null)
        }
      })
      .catch(() => {
        setLoading(false)
        setError(true)
      })
  }

  useEffect(() => {
    refreshProjects()
  }, [])

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId,
        setActiveProjectId,
        projects,
        loading,
        error,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
