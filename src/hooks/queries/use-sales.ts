import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { localApiClient } from "@/lib/api-client"

export interface SaleItemDTO {
  product_id: string
  product_name: string
  quantity: number
  unit_price_usd: number
  tax_amount_usd: number
  total_price_usd: number
}

export interface SaleCreateDTO {
  client_id?: string
  client_name: string
  subtotal_usd: number
  tax_amount_usd: number
  total_amount_usd: number
  total_amount_bs: number
  exchange_rate: number
  payment_method: string
  reference_number?: string
  items: SaleItemDTO[]
}

export interface Sale {
  id: string
  client_name: string
  total_amount_usd: number
  total_amount_bs: number
  payment_method: string
  created_at: string
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await localApiClient.get<Sale[]>("/sales")
      return data
    },
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaleCreateDTO) => {
      const { data } = await localApiClient.post("/sales", payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] }) // Stock gets reduced
    },
  })
}
