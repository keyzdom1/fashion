"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useState } from "react";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  images: { id: string; url: string; position: number }[];
  variants: { id: string; size: string | null; color: string | null; stock_qty: number }[];
  category_id?: string | null;
}

export function ProductCard({ product }: { product: Product }) {
  const setCart = useCartStore((s) => s.setCart);
  const [adding, setAdding] = useState(false);
  const image = product.images[0]?.url;
  const firstAvailable = product.variants.find((v) => v.stock_qty > 0);

  async function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!firstAvailable || adding) return;
    setAdding(true);
    try {
      const cart = await api<{ items: never[]; total: number; item_count: number }>("/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_variant_id: firstAvailable.id, qty: 1 }),
      });
      setCart(cart.items, cart.total, cart.item_count);
    } catch {
      /* ignore */
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
      <Link href={`/product/${product.id}`} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface border border-border">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-secondary">No image</div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-accent-tertiary/90 px-3 py-1 text-[11px] font-semibold text-text-primary">
            New
          </span>
          <button
            onClick={addToCart}
            disabled={!firstAvailable || adding}
            className="absolute bottom-3 left-3 right-3 translate-y-12 rounded-full bg-accent-primary py-2.5 text-sm font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add to Cart"}
          </button>
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
          <p className="text-accent-primary font-bold">${Number(product.price).toFixed(2)}</p>
        </div>
      </Link>
    </motion.div>
  );
}
