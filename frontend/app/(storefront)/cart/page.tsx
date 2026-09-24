"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { api } from "@/lib/api";

export default function CartPage() {
  const { items, total, itemCount, setCart } = useCartStore();

  useEffect(() => {
    api<{ items: never[]; total: number; item_count: number }>("/cart")
      .then((c) => setCart(c.items, c.total, c.item_count, false))
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
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Shopping Cart</h1>
      <p className="mt-1 text-text-secondary">{itemCount} items</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-text-secondary">Your cart is empty.</p>
          <Link href="/" className="mt-4 inline-block rounded-full bg-accent-primary px-6 py-3 font-semibold text-white">
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-28 w-24 rounded-xl object-cover" />
                )}
                <div className="flex flex-1 flex-col">
                  <p className="font-semibold">{item.product_name}</p>
                  <p className="text-sm text-text-secondary">
                    {item.size} / {item.color} × {item.qty}
                  </p>
                  <p className="mt-auto font-bold text-accent-primary">
                    ${(Number(item.price) * item.qty).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="self-start text-text-secondary hover:text-accent-primary"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between rounded-2xl border border-border bg-surface p-6">
            <div>
              <p className="text-text-secondary">Total</p>
              <p className="text-2xl font-bold text-accent-primary">${Number(total).toFixed(2)}</p>
            </div>
            <Link
              href="/checkout"
              className="rounded-full bg-accent-primary px-8 py-3.5 font-semibold text-white hover:opacity-90"
            >
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
