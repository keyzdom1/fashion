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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      setImageFiles([]);
      setImagePreviews([]);
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removePendingImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearPendingImages() {
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    clearPendingImages();
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearPendingImages();
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
      let productId = editingId;

      if (editingId) {
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
      } else {
        const created = await api<AdminProduct>("/products", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            slug: form.slug,
            description: form.description,
            price: form.price,
            category_slug: categorySlug,
            sizes: form.sizes,
            colors: form.colors,
            stock_qty: Number(form.stock_qty) || 10,
          }),
        });
        productId = created.id;
      }

      let uploaded = 0;
      let uploadWarning = "";
      if (productId && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fd = new FormData();
          fd.append("file", file);
          try {
            await api(`/products/${productId}/images`, { method: "POST", body: fd });
            uploaded++;
          } catch (uploadErr) {
            const m = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
            if (/not found|404/i.test(m)) {
              uploadWarning =
                " Image upload unavailable until the backend is redeployed on Render — skipped remaining images.";
              break;
            }
            throw uploadErr;
          }
        }
      }

      const wasEdit = Boolean(editingId);
      setForm(EMPTY_FORM);
      setEditingId(null);
      clearPendingImages();
      setMsg(
        (wasEdit ? "Product updated" : "Product created") +
          (uploaded > 0 ? ` with ${uploaded} image${uploaded > 1 ? "s" : ""}` : "") +
          uploadWarning
      );
      setMsgOk(!uploadWarning);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
      setMsgOk(false);
    } finally {
      setUploading(false);
    }
  }

  async function addImagesToProduct(productId: string, files: File[]) {
    if (files.length === 0) return;
    setMsg("");
    let uploaded = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        await api(`/products/${productId}/images`, { method: "POST", body: fd });
        uploaded++;
      } catch (e) {
        const m = e instanceof Error ? e.message : "Upload failed";
        if (/not found|404/i.test(m)) {
          setMsg(
            "Image endpoint not found — redeploy the backend on Render to add images"
          );
          setMsgOk(false);
          return;
        }
        setMsg(m);
        setMsgOk(false);
        return;
      }
    }
    setMsg(`${uploaded} image${uploaded > 1 ? "s" : ""} added`);
    setMsgOk(true);
    load();
  }

  async function removeImage(productId: string, imageId: string) {
    try {
      await api(`/products/${productId}/images/${imageId}`, { method: "DELETE" });
      setMsg("Image removed");
      setMsgOk(true);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not remove image");
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

        <label className="block md:col-span-2">
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
          placeholder="Slug (e.g. red-satin-dress)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
          className={inputCls}
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
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={`${inputCls} md:col-span-2`}
          rows={2}
        />

        {/* Image upload */}
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide">
            Cloth Images
            {imageFiles.length > 0 ? ` (${imageFiles.length} selected)` : ""}
          </p>

          {editingId && (
            <div className="mb-3 flex flex-wrap gap-3">
              {(products.find((p) => p.id === editingId)?.images || []).map((img) => (
                <div key={img.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-28 w-24 rounded-xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(editingId, img.id)}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-sm text-white shadow"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label
              htmlFor="product-image"
              className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                imageFiles.length > 0
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:border-accent-primary hover:bg-accent-primary/5"
              }`}
            >
              <span className="text-3xl" aria-hidden>
                📷
              </span>
              <span className="text-sm font-semibold">
                {imageFiles.length > 0 ? "Add more images" : "Click to upload cloth images"}
              </span>
              <span className="text-xs text-text-secondary">
                Select multiple files · JPG, PNG, WebP or GIF · max 5MB each
              </span>
              <input
                id="product-image"
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFileChange}
                className="sr-only"
              />
            </label>

            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="h-28 w-24 rounded-xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingImage(i)}
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-sm text-white shadow"
                      aria-label="Remove selected image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageFiles.length > 0 && (
              <p className="text-xs text-text-secondary">
                {imageFiles.map((f) => `${f.name} (${(f.size / 1024).toFixed(0)} KB)`).join(", ")}
              </p>
            )}
          </div>
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
                          + image{(p.images?.length || 0) > 0 ? ` (${p.images?.length || 0})` : ""}
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) addImagesToProduct(p.id, files);
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
