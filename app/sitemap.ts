import type { MetadataRoute } from "next";
import { listBrands, listProducts } from "@/lib/api/generated/catalog/catalog";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands] = await Promise.all([
    listProducts({ limit: 50 }).catch(() => null),
    listBrands().catch(() => null),
  ]);
  const base = env.siteUrl;
  return [
    { url: base },
    { url: `${base}/lentes` },
    ...(brands?.status === 200
      ? brands.data.items.map((b) => ({ url: `${base}/marcas/${b.slug}` }))
      : []),
    ...(products?.status === 200
      ? products.data.items.map((p) => ({ url: `${base}/lentes/${p.slug}` }))
      : []),
  ];
}
