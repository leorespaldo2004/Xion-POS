import { create } from 'zustand';
import { LocalProduct } from '../database/repositories/productRepository';
import { LocalClient } from '../database/repositories/clientRepository';
import { convertUsdToVes } from '../utils/formatters';

export interface CartItem {
  product_id: string;
  product_name: string;
  barcode: string | null;
  unit_price_usd: number;
  quantity: number;
  total_price_usd: number;
  has_vat: boolean;
  max_stock: number;
}

export interface CartDiscount {
  type: 'percentage' | 'fixed';
  value: number;
}

interface CartState {
  items: CartItem[];
  client: LocalClient | null;
  discount: CartDiscount | null;
  notes: string;
  exchangeRate: number;
  vatRate: number; // e.g. 0.16 (16%)
  setExchangeRate: (rate: number) => void;
  setClient: (client: LocalClient | null) => void;
  applyDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  clearDiscount: () => void;
  setNotes: (notes: string) => void;
  addItem: (product: LocalProduct, qty?: number) => void;
  updateQuantity: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  getSubtotalUsd: () => number;
  getDiscountUsd: () => number;
  getTaxUsd: () => number;
  getTotalUsd: () => number;
  getTotalVes: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  client: null,
  discount: null,
  notes: '',
  exchangeRate: 36.5,
  vatRate: 0.16,

  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  setClient: (client) => set({ client }),
  applyDiscount: (type, value) => set({ discount: { type, value } }),
  clearDiscount: () => set({ discount: null }),
  setNotes: (notes) => set({ notes }),

  addItem: (product, qty = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex((i) => i.product_id === product.id);

    if (existingIndex > -1) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + qty;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total_price_usd = Number(
        (newQty * updated[existingIndex].unit_price_usd).toFixed(2)
      );
      set({ items: updated });
    } else {
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        unit_price_usd: product.price_usd,
        quantity: qty,
        total_price_usd: Number((product.price_usd * qty).toFixed(2)),
        has_vat: product.has_vat,
        max_stock: product.current_stock
      };
      set({ items: [...items, newItem] });
    }
  },

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const { items } = get();
    const updated = items.map((item) => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: qty,
          total_price_usd: Number((item.unit_price_usd * qty).toFixed(2))
        };
      }
      return item;
    });
    set({ items: updated });
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.product_id !== productId) });
  },

  clearCart: () => set({ items: [], client: null, discount: null, notes: '' }),

  getSubtotalUsd: () => {
    return Number(
      get()
        .items.reduce((acc, item) => acc + item.total_price_usd, 0)
        .toFixed(2)
    );
  },

  getDiscountUsd: () => {
    const { discount } = get();
    if (!discount || discount.value <= 0) return 0;
    const subtotal = get().getSubtotalUsd();
    if (discount.type === 'percentage') {
      return Number(((subtotal * discount.value) / 100).toFixed(2));
    }
    return Number(Math.min(discount.value, subtotal).toFixed(2));
  },

  getTaxUsd: () => {
    const { items, vatRate } = get();
    const discountUsd = get().getDiscountUsd();
    const rawSubtotal = get().getSubtotalUsd();

    const discountFactor = rawSubtotal > 0 ? (rawSubtotal - discountUsd) / rawSubtotal : 1;
    const taxableTotal = items
      .filter((i) => i.has_vat)
      .reduce((acc, i) => acc + i.total_price_usd, 0);

    return Number((taxableTotal * discountFactor * vatRate).toFixed(2));
  },

  getTotalUsd: () => {
    const subtotal = get().getSubtotalUsd();
    const discount = get().getDiscountUsd();
    const tax = get().getTaxUsd();
    return Number((Math.max(0, subtotal - discount) + tax).toFixed(2));
  },

  getTotalVes: () => {
    const totalUsd = get().getTotalUsd();
    const rate = get().exchangeRate;
    return convertUsdToVes(totalUsd, rate);
  }
}));
