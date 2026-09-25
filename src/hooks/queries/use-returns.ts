// filepath: src/hooks/queries/use-returns.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localApiClient } from "@/lib/api-client";

export interface ReturnItemInputDTO {
  sale_item_id: string;
  product_id: string;
  quantity: number;
}

export interface CreateReturnDTO {
  sale_id: string;
  reason: string;
  user_id?: string;
  supervisor_id?: string;
  items: ReturnItemInputDTO[];
}

export interface ReturnableItem {
  sale_item_id: string;
  product_id: string;
  product_name: string;
  original_quantity: number;
  already_returned_quantity: number;
  remaining_quantity: number;
  unit_price_usd: number;
  tax_amount_usd: number;
  total_price_usd: number;
}

export interface ReturnItemResponse {
  id: string;
  sale_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_usd: number;
  tax_amount_usd: number;
  total_price_usd: number;
}

export interface SaleReturn {
  id: string;
  sale_id: string;
  user_id: string;
  supervisor_id?: string;
  subtotal_usd: number;
  tax_amount_usd: number;
  total_amount_usd: number;
  total_amount_bs: number;
  exchange_rate: number;
  reason: string;
  created_at: string;
  items: ReturnItemResponse[];
}

export function useReturns(filters?: { sale_id?: string; user_id?: string }) {
  return useQuery({
    queryKey: ["returns", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.sale_id) params.append("sale_id", filters.sale_id);
      if (filters?.user_id) params.append("user_id", filters.user_id);
      const { data } = await localApiClient.get<SaleReturn[]>(`/returns?${params.toString()}`);
      return data;
    },
  });
}

export function useSaleReturnableItems(saleId: string | undefined) {
  return useQuery({
    queryKey: ["sale-returnable-items", saleId],
    queryFn: async () => {
      const { data } = await localApiClient.get<ReturnableItem[]>(`/returns/sales/${saleId}/items`);
      return data;
    },
    enabled: !!saleId,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReturnDTO) => {
      const { data } = await localApiClient.post<SaleReturn>("/returns", payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sale-returnable-items", data.sale_id] });
      queryClient.invalidateQueries({ queryKey: ["cash-session"] });
    },
  });
}
