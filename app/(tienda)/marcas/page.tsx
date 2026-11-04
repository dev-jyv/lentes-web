import type { Metadata } from "next";
import Link from "next/link";
import { mergeBrands } from "@/lib/navigation";
import { loadFacets } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("brands.title"),
  description: t("brands.description"),
};

export default async function BrandsPage() {
  const [frames, lenses] = await Promise.all([loadFacets("frame"), loadFacets("contact_lens")]);
  const brands = mergeBrands(frames, lenses);
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl">{t("brands.title")}</h1>
      {brands.length === 0 ? (
        <p className="text-muted-foreground">{t("brands.unavailable")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/marcas/${b.slug}`}
                className="flex h-full min-h-16 items-center rounded-xl border bg-card p-4 font-display font-semibold transition-colors hover:border-primary hover:bg-accent"
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
