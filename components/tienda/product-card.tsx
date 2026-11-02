import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/lib/api/generated/model";
import { imageSrc } from "@/lib/images";
import { formatMxn, productHref, replacementLabel, shapeLabel } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const src = imageSrc(product.image_url);
  return (
    <Link href={productHref(product)} className="group">
      <Card className="h-full gap-0 overflow-hidden rounded-xl py-0 transition-all group-hover:-translate-y-0.5 group-hover:border-primary group-hover:shadow-md">
        <div className="relative aspect-square bg-secondary">
          {src ? (
            <Image src={src} alt={product.name} fill unoptimized className="object-contain p-4" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <p className="text-xs text-muted-foreground">{product.brand.name}</p>
          <h3 className="text-base leading-tight">{product.name}</h3>
          {product.frame && (
            <p className="text-xs text-muted-foreground">
              {shapeLabel[product.frame.shape]} · {product.color_count} {product.color_count === 1 ? "color" : "colores"}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {product.replacement && <Badge variant="secondary">{replacementLabel[product.replacement]}</Badge>}
            {product.from_price_cents != null ? (
              <span className="text-sm">
                Desde <strong className="font-display text-base">{formatMxn(product.from_price_cents)}</strong>
              </span>
            ) : (
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-warn">Agotado</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
