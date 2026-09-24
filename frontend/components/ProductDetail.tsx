"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/store/cart";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  stock_qty: number;
  price_adjustment: string | number;
}

interface ProductFull {
  id: string;
  name: string;
  description: string;
  price: string | number;
  images: { url: string }[];
  variants: Variant[];
}

export function ProductDetail({ product }: { product: ProductFull }) {
  const setCart = useCartStore((s) => s.setCart);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);

  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size).filter((s): s is string => Boolean(s)))),
    [product.variants]
  );
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.color).filter((c): c is string => Boolean(c)))),
    [product.variants]
  );

  const selectedVariant = product.variants.find(
    (v) =>
      (selectedSize === null || v.size === selectedSize) &&
      (selectedColor === null || v.color === selectedColor) &&
      v.stock_qty > 0
  );

  async function addToCart() {
    setError("");
    if (!selectedVariant) {
      setError("Please select size and color");
      return;
    }
    try {
      const cart = await api<{ items: never[]; total: number; item_count: number }>("/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_variant_id: selectedVariant.id, qty }),
      });
      setCart(cart.items, cart.total, cart.item_count, true);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to cart");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[3/4] overflow-hidden rounded-3xl border border-border bg-surface">
            {product.images[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[activeImage].url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary">No image</div>
            )}
          </div>
          <div className="flex gap-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-20 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === activeImage ? "border-accent-primary" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{product.name}</h1>
            <p className="mt-2 text-3xl font-bold text-accent-primary">{formatNaira(product.price)}</p>
          </div>

          <p className="leading-relaxed text-text-secondary">{product.description}</p>

          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      selectedColor === c
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border hover:border-accent-tertiary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const available = product.variants.some(
                    (v) => v.size === s && v.stock_qty > 0 && (selectedColor === null || v.color === selectedColor)
                  );
                  return (
                    <button
                      key={s}
                      onClick={() => available && setSelectedSize(s)}
                      disabled={!available}
                      className={`min-w-[3rem] rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        selectedSize === s
                          ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                          : available
                          ? "border-border hover:border-accent-tertiary"
                          : "border-border opacity-40 line-through"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2 text-lg" aria-label="Decrease quantity">
                −
              </button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2 text-lg" aria-label="Increase quantity">
                +
              </button>
            </div>
            {selectedVariant && (
              <span className="text-sm text-text-secondary">
                {selectedVariant.stock_qty} in stock
              </span>
            )}
          </div>

          {error && <p className="text-sm text-accent-primary">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={addToCart}
            className="w-full rounded-full bg-accent-primary py-4 text-lg font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span key="added" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  ✓ Added to Cart
                </motion.span>
              ) : (
                <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Add to Cart
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
