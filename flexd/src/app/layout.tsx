import type { Metadata, Viewport } from "next";
import { Cinzel, Jost, Playfair_Display } from "next/font/google";
import { brand } from "@/config/brand";
import { AgeGate, AppHydrator, Footer, PrototypeBanner, Toast } from "@/components/shell/chrome";
import { LazyOverlays } from "@/components/shell/lazy-overlays";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";
import { returningBootScript } from "@/lib/theme";
import "./globals.css";

// Cinzel: capitals for headlines and names. Playfair Display: prices. Jost: the text face.
const display = Cinzel({ variable: "--font-display-face", subsets: ["latin"] });
const body = Jost({ variable: "--font-body", subsets: ["latin"] });
const price = Playfair_Display({ variable: "--font-price-face", subsets: ["latin"] });

// Absolute URLs for link previews: an explicit site URL, else Vercel's production domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${brand.name}: open a box, keep the piece or sell it back`, template: `%s · ${brand.name}` },
  description: brand.description,
  robots: { index: false, follow: false },
  openGraph: { siteName: brand.name, type: "website" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#0A0510",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${body.variable} ${price.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: returningBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <PrototypeBanner />
        <TopBar />
        <main className="flex-1">{children}</main>
        <div className="pb-tabbar">
          <Footer />
        </div>
        <TabBar />
        <LazyOverlays />
        <Toast />
        <AgeGate />
        <AppHydrator />
      </body>
    </html>
  );
}
