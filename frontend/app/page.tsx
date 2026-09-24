import Link from "next/link";
import { ProductCard, Product } from "@/components/ProductCard";
import { API_URL } from "@/lib/api";

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products?page_size=500`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center space-y-6">
            <span className="w-fit rounded-full bg-accent-tertiary/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-primary">
              New Season Drop
            </span>
            <h1 className="font-display text-5xl font-extrabold leading-tight md:text-6xl">
              Dress{" "}
              <span className="text-accent-primary">Bold.</span>
              <br />
              Live{" "}
              <span className="text-accent-secondary">Bright.</span>
            </h1>
            <p className="max-w-md text-text-secondary">
              Vibrant, trend-forward pieces designed to turn heads. Free shipping on orders over $100.
            </p>
            <div className="flex gap-4">
              <Link
                href="/collections/dresses"
                className="rounded-full bg-accent-primary px-8 py-3.5 font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Shop Now
              </Link>
              <Link
                href="/collections/accessories"
                className="rounded-full border-2 border-border px-8 py-3.5 font-semibold hover:border-accent-primary hover:text-accent-primary transition-colors"
              >
                Explore
              </Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -right-8 top-8 h-72 w-72 rounded-full bg-accent-primary/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-accent-secondary/20 blur-3xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800"
              alt="Fashion hero"
              className="relative z-10 h-full w-full rounded-3xl object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold">Shop by Category</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {["dresses", "tops", "bottoms", "pants", "outerwear", "accessories"].map((slug) => (
            <Link
              key={slug}
              href={`/collections/${slug}`}
              className="group rounded-2xl border border-border bg-surface p-6 text-center capitalize transition-all hover:border-accent-primary hover:shadow-lg"
            >
              <span className="font-display text-lg font-semibold group-hover:text-accent-primary">
                {slug}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold">All Clothes</h2>
          <span className="text-sm text-text-secondary">{products.length} items</span>
        </div>
        {products.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center text-text-secondary">
            No products yet. Start the backend (<code>uvicorn app.main:app --reload</code>) and run{" "}
            <code>python seed.py</code> to populate the catalog.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
