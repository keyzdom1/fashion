import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { CartButton } from "./CartButton";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";

const LINKS = [
  { href: "/collections/dresses", label: "Dresses" },
  { href: "/collections/tops", label: "Tops" },
  { href: "/collections/bottoms", label: "Bottoms" },
  { href: "/collections/pants", label: "Pants" },
  { href: "/collections/outerwear", label: "Outerwear" },
  { href: "/collections/accessories", label: "Accessories" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:py-4">
        <div className="flex items-center gap-2">
          <MobileMenu />
          <Link href="/" className="font-display text-xl font-bold tracking-tight md:text-2xl">
            FASHION<span className="text-accent-primary">.</span>
          </Link>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium hover:text-accent-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <UserMenu />
          <CartButton />
        </div>
      </nav>
    </header>
  );
}
