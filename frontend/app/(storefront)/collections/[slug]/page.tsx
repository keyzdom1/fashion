import { ProductCard, Product } from "@/components/ProductCard";
import { API_URL } from "@/lib/api";
import { notFound } from "next/navigation";

async function getCollection(slug: string): Promise<{ products: Product[]; name: string }> {
  try {
    const res = await fetch(`${API_URL}/products?category=${slug}&page_size=500`, { cache: "no-store" });
    if (!res.ok) return { products: [], name: slug };
    const data = await res.json();
    return { products: data.items || [], name: slug };
  } catch {
    return { products: [], name: slug };
  }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const valid = ["dresses", "tops", "bottoms", "pants", "outerwear", "accessories"];
  if (!valid.includes(params.slug)) notFound();

  const { products, name } = await getCollection(params.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-primary">Collection</p>
        <h1 className="font-display text-4xl font-bold capitalize md:text-5xl">{name}</h1>
        <p className="mt-2 text-text-secondary">{products.length} styles</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-text-secondary">
          No products in this collection yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
