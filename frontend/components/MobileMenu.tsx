"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const LINKS = [
  { href: "/collections/dresses", label: "Dresses" },
  { href: "/collections/tops", label: "Tops" },
  { href: "/collections/bottoms", label: "Bottoms" },
  { href: "/collections/outerwear", label: "Outerwear" },
  { href: "/collections/accessories", label: "Accessories" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent-primary/10 transition-colors md:hidden"
        aria-label="Open menu"
      >
        ☰
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-surface md:hidden"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <Link href="/" className="font-display text-xl font-bold" onClick={() => setOpen(false)}>
                  FASHION<span className="text-accent-primary">.</span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg"
                >
                  ×
                </button>
              </div>

              <nav className="flex flex-col gap-1 p-4">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-accent-tertiary/20 hover:text-accent-primary ${
                      pathname === link.href ? "bg-accent-primary/10 text-accent-primary" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-border p-4 space-y-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent-tertiary/20"
                >
                  Sign In
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent-tertiary/20"
                >
                  My Orders
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent-tertiary/20"
                >
                  Wishlist
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
