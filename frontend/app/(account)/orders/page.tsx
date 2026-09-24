"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  product_name: string;
  qty: number;
  price: string | number;
  size: string | null;
  color: string | null;
}

interface Order {
  id: string;
  status: string;
  total: string | number;
  created_at: string;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-accent-secondary/20 text-accent-secondary",
  processing: "bg-accent-tertiary/20 text-accent-tertiary",
  shipped: "bg-accent-primary/20 text-accent-primary",
  delivered: "bg-green-500/20 text-green-500",
  cancelled: "bg-red-500/20 text-red-500",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Order[]>("/orders")
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Your Orders</h1>

      {loading && <p className="mt-8 text-text-secondary">Loading…</p>}
      {error && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-text-secondary">{error}</p>
          <Link href="/login" className="mt-4 inline-block text-accent-primary hover:underline">
            Sign in to view orders
          </Link>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center text-text-secondary">
          No orders yet.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-text-secondary">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-text-secondary">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                  STATUS_COLORS[order.status] || "bg-gray-500/20"
                }`}
              >
                {order.status}
              </span>
              <p className="text-lg font-bold text-accent-primary">${Number(order.total).toFixed(2)}</p>
            </div>
            <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm text-text-secondary">
              {order.items.map((item) => (
                <p key={item.id}>
                  {item.product_name} ({item.size}/{item.color}) × {item.qty}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
