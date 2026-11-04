import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/tienda/product-card";
import { SearchTracker } from "@/components/tienda/search-tracker";
import { listProducts } from "@/lib/api/generated/api";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

export const metadata: Metadata = {
  title: t("search.title"),
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ q?: string | string[] }>;

const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q: rawQ } = await searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ ?? "").trim();
  const length = [...q].length;
  const valid = length >= MIN_LENGTH && length <= MAX_LENGTH;

  const [frames, lenses] = valid
    ? await Promise.all([
        listProducts({ q, category: "frame", limit: 40 }).catch(() => null),
        listProducts({ q, category: "contact_lens", limit: 40 }).catch(() => null),
      ])
    : [null, null];
  const failed = valid && (frames?.status !== 200 || lenses?.status !== 200);
  const frameItems = frames?.status === 200 ? frames.data.items : [];
  const lensItems = lenses?.status === 200 ? lenses.data.items : [];
  const total = frameItems.length + lensItems.length;

  return (
    <div className="container-page space-y-8 py-10">
      <h1 className="text-3xl">{valid ? t("search.results", { q }) : t("search.title")}</h1>
      {!valid && <p className="text-muted-foreground">{t("search.lengthHint", { min: MIN_LENGTH, max: MAX_LENGTH })}</p>}
      {failed && <p role="alert" className="text-muted-foreground">{t("search.failed")}</p>}
      {valid && !failed && <SearchTracker length={length} results={total} />}
      {valid && !failed && total === 0 && (
        <p className="text-muted-foreground">
          {rich(t("search.empty"), {
            frames: (c) => <Link href="/armazones" className="text-primary underline">{c}</Link>,
            lenses: (c) => <Link href="/lentes" className="text-primary underline">{c}</Link>,
          })}
        </p>
      )}
      {frameItems.length > 0 && (
        <section aria-labelledby="res-armazones" className="space-y-4">
          <h2 id="res-armazones" className="text-2xl">{t("common.frames")}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {frameItems.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      {lensItems.length > 0 && (
        <section aria-labelledby="res-lentes" className="space-y-4">
          <h2 id="res-lentes" className="text-2xl">{t("common.contactLenses")}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {lensItems.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
