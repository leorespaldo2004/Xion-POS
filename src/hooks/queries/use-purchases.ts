import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export interface PurchaseItemDTO {
  product_id: string;
  quantity: number;
  unit_cost_usd: number;
  total_cost_usd: number;
  product_name?: string;
  product_sku?: string;
}

export interface Purchase {
  id: string;
  supplier_id?: string;
  supplier_name: string;
  invoice_number?: string;
  total_amount_usd: number;
  total_amount_bs: number;
  exchange_rate: number;
  payment_type: 'cash' | 'credit';
  payment_status: 'paid' | 'pending' | 'partial';
  paid_amount_usd: number;
  pending_amount_usd: number;
  credit_days: number;
  notes?: string;
  created_at: string;
  items_count?: number;
  items?: PurchaseItemDTO[];
}

export interface CreatePurchaseDTO {
  supplier_id?: string;
  supplier_name: string;
  total_amount_usd: number;
  total_amount_bs: number;
  payment_type?: "cash" | "credit";
  paid_amount_usd?: number;
  credit_days?: number;
  notes?: string;
  items: PurchaseItemDTO[];
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseData: CreatePurchaseDTO) => {
      const { data } = await localApiClient.post('/purchases', purchaseData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function usePurchases() {
  return useQuery<Purchase[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data } = await localApiClient.get('/purchases');
      return data;
    },
  });
}

export function usePurchaseDetail(id: string | null) {
  return useQuery<Purchase>({
    queryKey: ['purchases', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await localApiClient.get(`/purchases/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePayPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      purchaseId,
      amount_usd,
      notes,
      exchange_rate,
    }: {
      purchaseId: string;
      amount_usd: number;
      notes?: string;
      exchange_rate?: number;
    }) => {
      const { data } = await localApiClient.post(`/purchases/${purchaseId}/pay`, {
        amount_usd,
        notes,
        exchange_rate,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

