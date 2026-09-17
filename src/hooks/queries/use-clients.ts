import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  identification_type: string;
  identification_number: string;
  credit_limit: number;
  current_debt: number;
  is_active: boolean;
  is_synced: boolean;
}

export interface CreateClientDTO {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  identification_type: string;
  identification_number: string;
  credit_limit: number;
  current_debt: number;
  is_active: boolean;
}

export function useClients() {
  return useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await localApiClient.get<Client[]>('/clients');
      return data;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newClient: CreateClientDTO) => {
      const { data } = await localApiClient.post<Client>('/clients', newClient);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClientDTO> }) => {
      const response = await localApiClient.put<Client>(`/clients/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await localApiClient.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
