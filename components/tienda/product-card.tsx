import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/lib/api/generated/model";
import { imageSrc } from "@/lib/images";
import { formatMxn, replacementLabel } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const src = imageSrc(product.image_url);
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
            {product.from_price_cents != null ? (
              <span className="text-sm">
                Desde <strong>{formatMxn(product.from_price_cents)}</strong>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Agotado</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
