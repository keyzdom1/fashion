import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { CartButton } from "./CartButton";
import { UserMenu } from "./UserMenu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          FASHION<span className="text-accent-primary">.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/collections/dresses" className="text-sm font-medium hover:text-accent-primary transition-colors">
            Dresses
          </Link>
          <Link href="/collections/tops" className="text-sm font-medium hover:text-accent-primary transition-colors">
            Tops
          </Link>
          <Link href="/collections/bottoms" className="text-sm font-medium hover:text-accent-primary transition-colors">
            Bottoms
          </Link>
          <Link href="/collections/outerwear" className="text-sm font-medium hover:text-accent-primary transition-colors">
            Outerwear
          </Link>
          <Link href="/collections/accessories" className="text-sm font-medium hover:text-accent-primary transition-colors">
            Accessories
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
          <CartButton />
        </div>
      </nav>
    </header>
  );
}
