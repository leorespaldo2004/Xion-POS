// filepath: src/hooks/queries/use-cash-register.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { localApiClient, API_BASE_URL } from "@/lib/api-client"
import { toast } from "sonner"

export interface CashSession {
  id: string
  user_id: string
  user_name: string
  opening_time: string
  closing_time?: string
  opening_balance_usd: number
  closing_balance_usd: number
  total_sales_usd: number
  total_tax_usd: number
  payments_summary_json: string
  status: "open" | "closed"
}

export function useActiveSession() {
  return useQuery<CashSession | null>({
    queryKey: ["active-session"],
    queryFn: async () => {
      const { data } = await localApiClient.get("/cash-register/active")
      return data
    },
    refetchInterval: 10000,
  })
}

export function useSessionSummary() {
  return useQuery({
    queryKey: ["session-summary"],
    queryFn: async () => {
      const { data } = await localApiClient.get("/cash-register/summary")
      return data
    },
    refetchInterval: 5000,
  })
}

export function useOpenSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { user_id: string; opening_balance_usd: number }) => {
      const { data } = await localApiClient.post("/cash-register/open", payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] })
      toast.success("Caja abierta exitosamente")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Error al abrir caja")
    },
  })
}

export function useCloseSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { closing_balance_usd: number }) => {
      const { data } = await localApiClient.post("/cash-register/close", payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["active-session"] })
      queryClient.invalidateQueries({ queryKey: ["system-status"] })
      queryClient.invalidateQueries({ queryKey: ["session-summary"] })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      toast.success("Caja cerrada exitosamente. Imprimiendo reporte...")
      
      const sessionId = data?.session?.id
      if (sessionId) {
        window.open(`${API_BASE_URL}/cash-register/session/${sessionId}/report`, "_blank")
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Error al cerrar caja")
    },
  })
}
