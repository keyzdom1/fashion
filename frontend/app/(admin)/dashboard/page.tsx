"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { useAuthStore } from "@/store/auth";

interface Stats {
  products: number;
  orders: number;
  revenue: number;
}

export default function DashboardPage() {
  const role = useAuthStore((s) => s.role);
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, revenue: 0 });
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [products, orders] = await Promise.all([
          api<{ total: number }>("/products?page_size=1"),
          api<never[]>("/orders/all"),
        ]);
        const revenue = Array.isArray(orders)
          ? orders.reduce((sum: number, o: { total: string | number }) => sum + Number(o.total), 0)
          : 0;
        setStats({ products: products.total, orders: Array.isArray(orders) ? orders.length : 0, revenue });
      } catch {
        setUnauthorized(true);
      }
    }
    load();
  }, []);

  if (unauthorized && role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Admin Access Required</h1>
        <Link href="/login" className="mt-4 inline-block text-accent-primary hover:underline">
          Sign in as admin
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/dashboard/products" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-accent-primary">
            Manage Products
          </Link>
          <Link href="/dashboard/orders" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-accent-primary">
            Manage Orders
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-text-secondary">Products</p>
          <p className="mt-2 text-4xl font-bold text-accent-primary">{stats.products}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-text-secondary">Orders</p>
          <p className="mt-2 text-4xl font-bold text-accent-secondary">{stats.orders}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-text-secondary">Revenue</p>
          <p className="mt-2 text-4xl font-bold text-accent-tertiary">{formatNaira(stats.revenue)}</p>
        </div>
      </div>
    </div>
  );
}
