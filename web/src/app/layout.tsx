import type { Metadata, Viewport } from "next";
import { brand } from "@/config/brand";
import { brandAsset, brandPack, themeCss } from "@/config/brand-pack";
import { fontVariables } from "./fonts";
import { AgeGate } from "@/components/layout/age-gate";
import { PrototypeBanner } from "@/components/layout/prototype-banner";
import { SessionHydrator } from "@/components/layout/session-hydrator";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteOnly } from "@/components/layout/site-only";
import { Cursor } from "@/components/fx/cursor";
import { SmoothScroll } from "@/components/fx/smooth-scroll";
import { themeBootScript } from "@/lib/theme";
import { CatalogProvider } from "@/components/catalog-provider";
import { SiteSettingsProvider } from "@/components/site-settings-provider";
import { loadCatalogData, loadSiteSettings } from "@/services/catalog-source";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  icons: { icon: brandAsset(brandPack.logo.icon), apple: brandAsset(brandPack.logo.appleIcon) },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: brandPack.themeColor.dark },
    { media: "(prefers-color-scheme: light)", color: brandPack.themeColor.light },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [catalog, settings] = await Promise.all([loadCatalogData(), loadSiteSettings()]);
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {/* The brand pack's colours; globals.css holds the same tokens as fallbacks. */}
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      </head>
      <body className="flex min-h-full flex-col">
        <CatalogProvider data={catalog}>
          <SiteSettingsProvider value={settings}>
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
          </SiteSettingsProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
