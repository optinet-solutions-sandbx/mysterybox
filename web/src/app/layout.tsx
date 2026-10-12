import type { Metadata, Viewport } from "next";
import { Cinzel, Geist_Mono, Jost } from "next/font/google";
import { brand } from "@/config/brand";
import { AgeGate } from "@/components/layout/age-gate";
import { PrototypeBanner } from "@/components/layout/prototype-banner";
import { SessionHydrator } from "@/components/layout/session-hydrator";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteOnly } from "@/components/layout/site-only";
import { Cursor } from "@/components/fx/cursor";
import { SmoothScroll } from "@/components/fx/smooth-scroll";
import { themeBootScript } from "@/lib/theme";
import "lenis/dist/lenis.css";
import "./globals.css";

// Cinzel: inscriptional capitals from the brand board. Jost: geometric text face.
// Geist Mono only for genuinely technical strings (seed hashes).
const display = Cinzel({ variable: "--font-display-face", subsets: ["latin"] });
const body = Jost({ variable: "--font-body", subsets: ["latin"], style: ["normal", "italic"] });
const numeric = Geist_Mono({ variable: "--font-numeric", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
    { media: "(prefers-color-scheme: light)", color: "#f6f2ea" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${numeric.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <PrototypeBanner />
        <SiteOnly>
          <SiteHeader />
        </SiteOnly>
        <main className="flex-1">{children}</main>
        <SiteOnly>
          <SiteFooter />
          <AgeGate />
          <SmoothScroll />
          <Cursor />
        </SiteOnly>
        <SessionHydrator />
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
