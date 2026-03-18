import { useQuery } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

interface HealthCheckResponse {
  status: string;
  db_connected: boolean;
}

export function useHealthCheck() {
  return useQuery<HealthCheckResponse, Error>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await localApiClient.get<HealthCheckResponse>('/health');
      return response.data;
    },
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
