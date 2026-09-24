import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  product_variant_id: string;
  qty: number;
  product_name: string;
  size: string | null;
  color: string | null;
  price: number;
  image_url: string | null;
  stock_qty: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isOpen: boolean;
  setCart: (items: CartItem[], total: number, itemCount: number) => void;
  setOpen: (open: boolean) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      itemCount: 0,
      isOpen: false,
      setCart: (items, total, itemCount) => set({ items, total, itemCount, isOpen: true }),
      setOpen: (isOpen) => set({ isOpen }),
      clear: () => set({ items: [], total: 0, itemCount: 0, isOpen: false }),
    }),
    { name: "cart-preview" }
  )
);
