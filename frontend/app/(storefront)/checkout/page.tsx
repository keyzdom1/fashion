"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import Link from "next/link";

const STEPS = ["Shipping", "Review", "Payment"] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCartStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
    country: "US",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function placeOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ order_id: string }>("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({ shipping: form }),
      });
      setOrderId(res.order_id);
      clear();
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (orderId && step === 2) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-primary text-4xl text-white">
          ✓
        </div>
        <h1 className="font-display text-3xl font-bold">Order Confirmed!</h1>
        <p className="mt-2 text-text-secondary">
          Order <strong>#{orderId.slice(0, 8)}</strong> has been placed.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/orders" className="rounded-full bg-accent-primary px-6 py-3 font-semibold text-white">
            View Orders
          </Link>
          <Link href="/" className="rounded-full border border-border px-6 py-3 font-semibold">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className="mt-4 inline-block text-accent-primary hover:underline">
          ← Back to shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>

      {/* Steps */}
      <div className="mt-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i <= step ? "bg-accent-primary text-white" : "bg-surface border border-border text-text-secondary"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= step ? "" : "text-text-secondary"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold">Shipping Details</h2>
              {(
                [
                  ["email", "Email", "email"],
                  ["full_name", "Full Name", "text"],
                  ["line1", "Address Line 1", "text"],
                  ["line2", "Address Line 2 (optional)", "text"],
                  ["city", "City", "text"],
                  ["postal_code", "Postal Code", "text"],
                  ["country", "Country (2-letter)", "text"],
                ] as const
              ).map(([field, label, type]) => (
                <div key={field}>
                  <label className="mb-1 block text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={(e) => update(field, e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 outline-none focus:border-accent-primary"
                    required={field !== "line2"}
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  if (!form.email || !form.full_name || !form.line1 || !form.city || !form.postal_code) {
                    setError("Please fill all required fields");
                    return;
                  }
                  setError("");
                  setStep(1);
                }}
                className="w-full rounded-full bg-accent-primary py-3.5 font-semibold text-white hover:opacity-90"
              >
                Continue to Review
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-xl font-bold">Review Order</h2>
              <div className="space-y-2 text-sm">
                <p><strong>Ship to:</strong> {form.full_name}, {form.line1}, {form.city} {form.postal_code}, {form.country}</p>
                <p><strong>Email:</strong> {form.email}</p>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between border-b border-border pb-2 text-sm">
                    <span>
                      {item.product_name} ({item.size}/{item.color}) × {item.qty}
                    </span>
                    <span>${(Number(item.price) * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-accent-primary">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 rounded-full border border-border py-3.5 font-semibold">
                  Back
                </button>
                <button
                  onClick={placeOrder}
                  disabled={loading}
                  className="flex-1 rounded-full bg-accent-primary py-3.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Processing…" : `Pay $${Number(total).toFixed(2)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="h-fit rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-display text-lg font-bold">Order Summary</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Subtotal</span>
              <span>${Number(total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Shipping</span>
              <span className="text-accent-secondary">Free</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-accent-primary">${Number(total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
