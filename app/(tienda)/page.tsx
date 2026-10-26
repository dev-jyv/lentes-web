import { ArrowRight, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { HeroLens } from "@/components/tienda/hero-lens";
import { categories } from "@/components/tienda/site-header";
import { ProductCard } from "@/components/tienda/product-card";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/api/generated/api";
import { BRAND } from "@/lib/brand";

const promises = [
  { icon: FileCheck2, title: "Receta revisada", text: "Revisamos tu receta antes de enviar tus lentes." },
  { icon: RefreshCw, title: "Reposición en un clic", text: "Repite un pedido anterior sin volver a elegir tu graduación." },
  { icon: ShieldCheck, title: "Pago seguro", text: "Paga con tarjeta, OXXO o SPEI a través de Mercado Pago." },
];

export default async function HomePage() {
  // Destacados reales; si la API no responde, la home sigue funcionando sin esa sección.
  const featured = await listProducts({ limit: 4 }).catch(() => null);
  const products = featured?.status === 200 ? featured.data.items : [];

  return (
    <>
      <section className="container-page grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="space-y-6">
          <p className="optic text-xs font-medium tracking-widest text-primary uppercase">
            Receta · marca · graduación
          </p>
          <h1 className="text-4xl leading-[1.05] sm:text-5xl xl:text-6xl">
            Lentes de contacto que llegan <em className="text-amber not-italic">antes</em> de que se acaben.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Elige tu marca, captura tu graduación y repón en un clic. En {BRAND.name} revisamos tu receta
            antes del envío.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/lentes" />} nativeButton={false}>
              Ver lentes <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/cuenta/recetas" />} nativeButton={false}>
              Subir mi receta
            </Button>
          </div>
        </div>
        <HeroLens />
      </section>

      <section aria-label="Promesas" className="border-y bg-card">
        <ul className="container-page grid gap-6 py-8 md:grid-cols-3">
          {promises.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page space-y-4 py-12">
        <h2 className="text-2xl">Compra por tipo</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="flex h-full items-center justify-between rounded-xl border bg-card p-4 font-display text-lg font-semibold transition-colors hover:border-primary hover:bg-accent"
              >
                {c.label}
                <ArrowRight className="size-5 text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {products.length > 0 && (
        <section className="container-page space-y-4 pb-12">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl">Novedades</h2>
            <Link href="/lentes" className="text-sm font-medium text-primary hover:underline">Ver todo</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </>
  );
}
