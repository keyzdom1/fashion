"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard, Product } from "@/components/ProductCard";

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Product[]>("/wishlist")
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Wishlist</h1>

      {loading && <p className="mt-8 text-text-secondary">Loading…</p>}
      {error && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-text-secondary">{error}</p>
          <Link href="/login" className="mt-4 inline-block text-accent-primary hover:underline">
            Sign in to view wishlist
          </Link>
        </div>
      )}
      {!loading && !error && products.length === 0 && (
        <p className="mt-8 text-text-secondary">Your wishlist is empty. Tap the heart on any product to save it.</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
