import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductSummary } from "@/lib/api/generated/model";
import { env } from "@/lib/env";
import { formatMxn, replacementLabel } from "@/lib/format";

export function ProductCard({ product }: { product: ProductSummary }) {
  const src =
    product.image_key && env.imgUrl ? `${env.imgUrl}/${product.image_key}` : null;
  return (
    <Link href={`/lentes/${product.slug}`} className="group">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-square bg-muted">
          {src ? (
            <Image src={src} alt={product.name} fill unoptimized className="object-contain p-4" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        <CardContent className="space-y-2 pt-4">
          <p className="text-xs text-muted-foreground">{product.brand.name}</p>
          <h3 className="font-medium leading-tight">{product.name}</h3>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{replacementLabel[product.replacement]}</Badge>
            <span className="text-sm">
              Desde <strong>{formatMxn(product.from_price_cents)}</strong>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
