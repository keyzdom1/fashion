"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/format";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  category_id: string | null;
  is_active: boolean;
  images?: { id: string; url: string }[];
  variants: { stock_qty: number }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];
const COLOR_PRESETS = ["Black", "White", "Navy", "Coral", "Gold", "Lilac", "Blush"];
const CATEGORY_OPTIONS = [
  { slug: "dresses", name: "Dress" },
  { slug: "tops", name: "Top" },
  { slug: "bottoms", name: "Bottom" },
  { slug: "pants", name: "Pants" },
  { slug: "outerwear", name: "Outerwear" },
  { slug: "accessories", name: "Accessories" },
];

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  price: "",
  category_slug: "dresses",
  sizes: ["M"] as string[],
  colors: ["Black"] as string[],
  stock_qty: "10",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const [data, cats] = await Promise.all([
        api<{ items: AdminProduct[] }>("/products?page_size=50&include_inactive=true"),
        api<Category[]>("/categories").catch(() => [] as Category[]),
      ]);
      setProducts(data.items || []);
      setCategories(cats || []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load products");
      setMsgOk(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  function toggleSize(s: string) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s],
    }));
  }

  function toggleColor(c: string) {
    setForm((f) => ({
      ...f,
      colors: f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c],
    }));
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function startEdit(p: AdminProduct) {
    const cat = categories.find((c) => c.id === p.category_id);
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      price: String(p.price),
      category_slug: cat?.slug || p.category_id || "dresses",
      sizes: ["M"],
      colors: ["Black"],
      stock_qty: "10",
    });
    setImageFile(null);
    setImagePreview(p.images?.[0]?.url || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMsg("");
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgOk(false);

    if (!editingId && (form.sizes.length === 0 || form.colors.length === 0)) {
      setMsg("Select at least one size and one color");
      setMsgOk(false);
      return;
    }

    const categorySlug =
      CATEGORY_OPTIONS.find((c) => c.slug === form.category_slug)?.slug ||
      form.category_slug ||
      "dresses";

    setUploading(true);
    try {
      if (editingId) {
        if (imageFile) {
          const existing = products.find((p) => p.id === editingId);
          const firstImg = existing?.images?.[0];
          if (firstImg) {
            await api(`/products/${editingId}/images/${firstImg.id}`, {
              method: "DELETE",
            });
          }
          const fd = new FormData();
          fd.append("file", imageFile);
          await api(`/products/${editingId}/images`, {
            method: "POST",
            body: fd,
          });
        }

        await api(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: form.name,
            slug: form.slug,
            description: form.description,
            price: form.price,
            category_slug: categorySlug,
          }),
        });

        setMsg("Product updated");
        setMsgOk(true);
        cancelEdit();
        load();
        return;
      }

      let image_url: string | undefined;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploaded = await api<{ url: string }>("/uploads", {
          method: "POST",
          body: fd,
        });
        image_url = uploaded.url;
      }

      await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          price: form.price,
          category_slug: categorySlug,
          image_url: image_url || null,
          sizes: form.sizes,
          colors: form.colors,
          stock_qty: Number(form.stock_qty) || 10,
        }),
      });

      setForm(EMPTY_FORM);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMsg("Product created" + (image_url ? " with image" : ""));
      setMsgOk(true);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
      setMsgOk(false);
    } finally {
      setUploading(false);
    }
  }

  async function addImageToProduct(productId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api(`/products/${productId}/images`, { method: "POST", body: fd });
      setMsg("Image added");
      setMsgOk(true);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
      setMsgOk(false);
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
      if (editingId === id) cancelEdit();
      load();
    } catch {
      /* ignore */
    }
  }

  const inputCls =
    "h-11 rounded-lg border border-border bg-bg px-4 py-0 outline-none focus:border-accent-primary w-full";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Products</h1>

      <form
        onSubmit={submitProduct}
        className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6 md:grid-cols-2"
      >
        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            {editingId ? "Edit Product" : "Add Product"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:border-accent-primary"
            >
              Cancel edit
            </button>
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Category</span>
          <select
            value={form.category_slug}
            onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
            className={inputCls}
            required
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <input
          placeholder="Price"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
          className={inputCls}
        />

        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            setForm((f) => ({
              ...f,
              name,
              slug: f.slug && editingId ? f.slug : slugify(name) || f.slug,
            }));
          }}
          required
          className={inputCls}
        />
        <input
          placeholder="Slug (e.g. red-satin-dress)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
          className={inputCls}
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={`${inputCls} md:col-span-2`}
          rows={2}
        />

        {!editingId && (
          <input
            placeholder="Stock per variant"
            type="number"
            min="0"
            value={form.stock_qty}
            onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
            className={inputCls}
          />
        )}

        {/* Image upload */}
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Cloth Image</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <label
              htmlFor="product-image"
              className={`flex min-h-[140px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                imagePreview
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:border-accent-primary hover:bg-accent-primary/5"
              }`}
            >
              <span className="text-3xl" aria-hidden>
                📷
              </span>
              <span className="text-sm font-semibold">
                {imagePreview
                  ? imageFile
                    ? "Change selected image"
                    : "Replace image"
                  : "Click to upload cloth image"}
              </span>
              <span className="text-xs text-text-secondary">JPG, PNG, WebP or GIF · max 5MB</span>
              <input
                id="product-image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFileChange}
                className="sr-only"
              />
            </label>
            {imagePreview && (
              <div className="relative self-start sm:self-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-36 w-36 rounded-2xl object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-sm text-white shadow"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {imageFile && (
            <p className="mt-2 text-xs text-text-secondary">
              Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {!editingId && (
          <>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Sizes</p>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`min-w-[3rem] rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                      form.sizes.includes(s)
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border hover:border-accent-tertiary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Colors</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleColor(c)}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.colors.includes(c)
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border hover:border-accent-tertiary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="md:col-span-2 rounded-full bg-accent-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {uploading
            ? "Saving…"
            : editingId
              ? "Save Changes"
              : "Create Product"}
        </button>
        {msg && (
          <p className={`md:col-span-2 text-sm ${msgOk ? "text-green-500" : "text-accent-primary"}`}>
            {msg}
          </p>
        )}
      </form>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="p-4 font-semibold">Image</th>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Price</th>
              <th className="p-4 font-semibold">Stock</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-secondary">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-secondary">
                  {msg ? (
                    <div className="space-y-3">
                      <p className="text-accent-primary">{msg}</p>
                      <button
                        onClick={load}
                        className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:border-accent-primary"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    "No products"
                  )}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock_qty, 0);
                const img = p.images?.[0]?.url;
                const cat = categories.find((c) => c.id === p.category_id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${
                      editingId === p.id ? "bg-accent-primary/5" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-12 w-10 rounded object-cover" />
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                        <label className="cursor-pointer text-xs text-accent-secondary hover:underline">
                          + image
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) addImageToProduct(p.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-text-secondary capitalize">
                        {cat?.slug || "uncategorized"}
                      </div>
                    </td>
                    <td className="p-4">{formatNaira(p.price)}</td>
                    <td className={`p-4 ${stock < 10 ? "text-accent-primary" : ""}`}>{stock}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                          p.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {p.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="text-xs font-semibold text-accent-secondary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className="text-xs text-accent-secondary hover:underline"
                        >
                          {p.is_active ? "Hide" : "Show"}
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="text-xs text-accent-primary hover:underline"
                        >
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
