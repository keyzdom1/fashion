"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { email, role, clear } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" aria-hidden />;

  if (!email) {
    return (
      <Link
        href="/login"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent-primary/10 transition-colors"
        aria-label="Sign in"
      >
        👤
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent-primary/10"
        aria-label="Account menu"
      >
        👤
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-48 rounded-lg border border-border bg-surface p-2 shadow-lg">
          <p className="truncate px-2 py-1 text-xs text-text-secondary">{email}</p>
          <Link href="/orders" className="block rounded px-2 py-1.5 text-sm hover:bg-accent-tertiary/20" onClick={() => setOpen(false)}>
            Orders
          </Link>
          <Link href="/wishlist" className="block rounded px-2 py-1.5 text-sm hover:bg-accent-tertiary/20" onClick={() => setOpen(false)}>
            Wishlist
          </Link>
          {role === "admin" && (
            <Link href="/dashboard" className="block rounded px-2 py-1.5 text-sm hover:bg-accent-tertiary/20" onClick={() => setOpen(false)}>
              Admin Dashboard
            </Link>
          )}
          <button
            onClick={() => {
              logout();
              clear();
              setOpen(false);
            }}
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-accent-primary hover:bg-accent-primary/10"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
