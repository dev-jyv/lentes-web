import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";
import { SiteHeader } from "@/components/tienda/site-header";
import { SiteFooter } from "@/components/tienda/site-footer";
import { loadCatalogs } from "@/lib/storefront";
import { t } from "@/lib/i18n";

// Tipografía del brand book: display, texto/interfaz y monoespaciada para valores ópticos.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

// El tema sigue al sistema: se fija antes del primer pintado y cambia en vivo si el sistema cambia.
const themeScript = `(function(){try{var m=matchMedia("(prefers-color-scheme: dark)");var s=function(){document.documentElement.dataset.theme=m.matches?"dark":"light"};s();m.addEventListener("change",s)}catch(e){}})()`;

export const metadata: Metadata = {
  title: { default: t("meta.defaultTitle"), template: t("meta.titleTemplate") },
  description: BRAND.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Etiquetas de atributos para los componentes de cliente (SPEC 16); cacheadas 300 s.
  const catalogs = await loadCatalogs();
  return (
    <html
      lang="es-MX"
      suppressHydrationWarning
      className={`${bricolage.variable} ${figtree.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers catalogs={catalogs}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
