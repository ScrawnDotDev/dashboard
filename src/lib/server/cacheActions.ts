import { createServerFn } from "@tanstack/react-start"
import { useSession } from "@tanstack/react-start/server"
import { sessionConfig } from "./cache"

export const clearDashboardSession = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const session = await useSession(sessionConfig)
      await session.update({
        ...session.data,
        dashboard_keys: {},
      })
      return { success: true }
    } catch (error) {
      console.error("Failed to clear dashboard session:", error)
      return { error: "Failed to clear dashboard session" }
    }
  }
)
