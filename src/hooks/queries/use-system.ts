import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export interface SystemStatus {
  status: string;
  database: string;
  anchor_currency: string;
  current_exchange_rate_bs: number;
  lockdown_mode: boolean;
  store_name: string;
  store_rif: string;
  store_address: string;
  store_phone: string;
  tax_rate: number;
  enable_taxes: boolean;
  wholesale_enabled: boolean;
  wholesale_min_qty: number;
  auto_print: boolean;
  print_logo: boolean;
  ticket_size: string;
  ticket_message: string;
  theme_mode: string;
  font_size: number;
  primary_color: string;
  compact_mode: boolean;
  animations: boolean;
  high_contrast: boolean;
  interface_density: string;
  payment_methods_json: string;
}

export type SystemUpdatePayload = Partial<Omit<SystemStatus, 'status' | 'database'>>;

export function useSystemStatus() {
  return useQuery<SystemStatus, Error>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const { data } = await localApiClient.get<SystemStatus>('/system/status');
      return data;
    },
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useUpdateSystem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SystemUpdatePayload) => {
      const { data } = await localApiClient.patch<{ status: string; detail: string }>('/system/config', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
  });
}
