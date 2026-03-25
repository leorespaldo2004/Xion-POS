import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "cashier" | "viewer";
  status: "active" | "inactive";
  last_login: string | null;
  perm_sales: boolean;
  perm_inventory: boolean;
  perm_reports: boolean;
  perm_users: boolean;
  created_at: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  role: "admin" | "manager" | "cashier" | "viewer";
  status: "active" | "inactive";
  perm_sales: boolean;
  perm_inventory: boolean;
  perm_reports: boolean;
  perm_users: boolean;
}

export function useUsers() {
  return useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await localApiClient.get<User[]>('/users');
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newUser: CreateUserDTO) => {
      const { data } = await localApiClient.post<User>('/users', newUser);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserDTO> }) => {
      const response = await localApiClient.put<User>(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await localApiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
