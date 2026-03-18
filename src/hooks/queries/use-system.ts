import { useQuery } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export interface SystemStatus {
  status: string;
  database: string;
  anchor_currency: string;
  current_exchange_rate_bs: number;
  lockdown_mode: boolean;
}

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
