import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productRepository, LocalProduct } from '../database/repositories/productRepository';

export function useProducts(searchQuery = '') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length > 0) {
        return await productRepository.search(searchQuery.trim());
      }
      return await productRepository.getAll();
    }
  });

  const getByBarcode = async (barcode: string): Promise<LocalProduct | null> => {
    return await productRepository.getByBarcode(barcode);
  };

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    getByBarcode
  };
}
