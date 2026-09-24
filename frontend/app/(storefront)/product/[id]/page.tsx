import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { API_URL } from "@/lib/api";

async function getProduct(id: string) {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
