import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  identification_type: string;
  identification_number: string;
  category: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  is_synced: boolean;
}

export interface CreateSupplierDTO {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  identification_type: string;
  identification_number: string;
  category: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
}

export function useSuppliers() {
  return useQuery<Supplier[], Error>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await localApiClient.get<Supplier[]>('/suppliers');
      return data;
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSupplier: CreateSupplierDTO) => {
      const { data } = await localApiClient.post<Supplier>('/suppliers', newSupplier);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSupplierDTO> }) => {
      const response = await localApiClient.put<Supplier>(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await localApiClient.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
