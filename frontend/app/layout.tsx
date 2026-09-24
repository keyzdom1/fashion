import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/Navbar";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "FASHION. — Bold, Trend-Forward Clothing",
  description: "Premium fashion e-commerce. Vibrant collections, smooth shopping.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable}`}>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t border-border bg-surface py-8 text-center text-sm text-text-secondary">
            © {new Date().getFullYear()} FASHION. All rights reserved.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
