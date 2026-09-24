"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/store/cart";
import { api } from "@/lib/api";
import Link from "next/link";

export function CartButton() {
  const { itemCount, isOpen, setOpen, setCart, items, total } = useCartStore();

  useEffect(() => {
    api<{ items: never[]; total: number; item_count: number }>("/cart")
      .then((cart) => setCart(cart.items, cart.total, cart.item_count, false))
      .catch(() => {});
  }, [setCart]);

  async function removeItem(id: string) {
    try {
      const cart = await api<{ items: never[]; total: number; item_count: number }>(
        `/cart/items/${id}`,
        { method: "DELETE" }
      );
      setCart(cart.items, cart.total, cart.item_count, false);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent-primary/10 transition-colors"
        aria-label="Open cart"
      >
        🛒
        {itemCount > 0 && (
          <motion.span
            key={itemCount}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-white"
          >
            {itemCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="font-display text-lg font-bold">Your Cart</h2>
                <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-xl">
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.length === 0 ? (
                  <p className="text-text-secondary">Your cart is empty.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-border pb-4">
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="h-20 w-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{item.product_name}</p>
                        <p className="text-xs text-text-secondary">
                          {item.size} / {item.color} × {item.qty}
                        </p>
                        <p className="text-sm text-accent-primary">
                          ${(Number(item.price) * item.qty).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="self-start text-text-secondary hover:text-accent-primary"
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border p-4 space-y-3">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-accent-primary">${Number(total).toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/cart"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full border border-border py-3 text-center font-semibold hover:border-accent-primary transition-colors"
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full bg-accent-primary py-3 text-center font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
