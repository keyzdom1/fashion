"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  is_active: boolean;
  variants: { stock_qty: number }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", description: "", price: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const data = await api<{ items: AdminProduct[] }>("/products?page_size=50");
      setProducts(data.items || []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify({ ...form, price: form.price }),
      });
      setForm({ name: "", slug: "", description: "", price: "" });
      setMsg("Product created");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function toggleActive(p: AdminProduct) {
    try {
      await api(`/products/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      load();
    } catch {
      /* ignore */
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await api(`/products/${id}`, { method: "DELETE" });
      load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Products</h1>

      <form onSubmit={createProduct} className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 font-display text-lg font-bold">Add Product</h2>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="rounded-lg border border-border bg-bg px-4 py-2.5 outline-none focus:border-accent-primary"
        />
        <input
          placeholder="Slug (e.g. red-satin-dress)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
          className="rounded-lg border border-border bg-bg px-4 py-2.5 outline-none focus:border-accent-primary"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded-lg border border-border bg-bg px-4 py-2.5 outline-none focus:border-accent-primary md:col-span-2"
          rows={2}
        />
        <input
          placeholder="Price"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
          className="rounded-lg border border-border bg-bg px-4 py-2.5 outline-none focus:border-accent-primary"
        />
        <button type="submit" className="rounded-full bg-accent-primary py-2.5 font-semibold text-white hover:opacity-90">
          Create Product
        </button>
        {msg && <p className="md:col-span-2 text-sm text-accent-primary">{msg}</p>}
      </form>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Price</th>
              <th className="p-4 font-semibold">Stock</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-secondary">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-secondary">No products</td></tr>
            ) : (
              products.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock_qty, 0);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4">${Number(p.price).toFixed(2)}</td>
                    <td className={`p-4 ${stock < 10 ? "text-accent-primary" : ""}`}>{stock}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${p.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                        {p.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => toggleActive(p)} className="text-xs text-accent-secondary hover:underline">
                          {p.is_active ? "Hide" : "Show"}
                        </button>
                        <button onClick={() => remove(p.id)} className="text-xs text-accent-primary hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
