import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localApiClient } from '@/lib/api-client';

export type ProductType = 'physical' | 'service' | 'virtual';
export type TaxType = 'none' | 'vat' | 'islr';

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  cost_usd: number;
  price_usd: number;
  product_type: ProductType;
  tax_type: TaxType;
  unit_measure: string;
  cached_stock_quantity: number;
  min_stock_alert: number;
  is_synced: boolean;
  is_deleted: boolean;
}

export interface CreateProductDTO {
  sku: string;
  name: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  cost_usd: number;
  price_usd: number;
  product_type: ProductType;
  tax_type: TaxType;
  unit_measure: string;
  min_stock_alert: number;
}

export function useProducts() {
  return useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await localApiClient.get<Product[]>('/inventory/products');
      return data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProduct: CreateProductDTO) => {
      const { data } = await localApiClient.post<Product>('/inventory/products', newProduct);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductDTO> }) => {
      const response = await localApiClient.put<Product>(`/inventory/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await localApiClient.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
