import type { MetadataRoute } from "next";
import { listBrands, listProducts } from "@/lib/api/generated/api";
import { env } from "@/lib/env";
import { productHref } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands] = await Promise.all([
    listProducts({ limit: 100 }).catch(() => null),
    listBrands().catch(() => null),
  ]);
  const base = env.siteUrl;
  return [
    { url: base },
    { url: `${base}/armazones` },
    { url: `${base}/lentes` },
    { url: `${base}/marcas` },
    ...(brands?.status === 200
      ? brands.data.items.map((b) => ({ url: `${base}/marcas/${b.slug}` }))
      : []),
    ...(products?.status === 200
      ? products.data.items.map((p) => ({ url: `${base}${productHref(p)}` }))
      : []),
  ];
}
