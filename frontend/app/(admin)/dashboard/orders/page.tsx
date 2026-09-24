"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AdminOrder {
  id: string;
  status: string;
  total: string | number;
  email: string | null;
  created_at: string;
  items: { id: string; product_name: string; qty: number }[];
}

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const data = await api<AdminOrder[]>("/orders/all");
      setOrders(data);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      await api(`/orders/${id}/status?status_value=${status}`, { method: "PATCH" });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Orders</h1>
      {msg && <p className="mt-4 text-sm text-accent-primary">{msg}</p>}

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-text-secondary">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-text-secondary">
            No orders yet.
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-text-secondary">{order.email}</p>
                  <p className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <p className="text-lg font-bold text-accent-primary">${Number(order.total).toFixed(2)}</p>
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent-primary"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 border-t border-border pt-3 text-sm text-text-secondary">
                {order.items.map((item) => (
                  <p key={item.id}>
                    {item.product_name} × {item.qty}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
