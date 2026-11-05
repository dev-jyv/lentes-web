import { ArrowRight, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { t } from "@/lib/i18n";

type Item = { href: string; label: string };

// Tipos de lente con foto propia, en orden de preferencia para la celda con foto de la segunda fila.
const NEED_PHOTOS = [
  { need: "toric", src: "/home/toricos.jpg", alt: t("home.photos.toric") },
  { need: "multifocal", src: "/home/multifocales.jpg", alt: t("home.photos.multifocal") },
  { need: "spherical", src: "/home/esfericos.jpg", alt: t("home.photos.spherical") },
];

// Parejas fijas de fondo y texto: el blanco solo va sobre azul oscuro o marino (spec 2026-11-05).
const BLOCK_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-mint text-navy",
  "bg-navy text-white",
  "bg-sun text-navy",
];

// Columnas según cuántos elementos haya, para que una fila incompleta no deje hueco a la derecha.
const ROW_COLS = ["", "", "sm:grid-cols-2", "sm:grid-cols-3"];
const REST_COLS = ["", "", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"];

function PhotoTile({ item, src, alt, sizes, className = "" }: { item: Item; src: string; alt: string; sizes: string; className?: string }) {
  return (
    <Link href={item.href} className={`group relative block overflow-hidden rounded-2xl bg-navy ${className}`}>
      <Image src={src} alt={alt} fill unoptimized sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-navy/85 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-5 font-display text-2xl font-extrabold text-white">
        {item.label} <ArrowRight className="size-6" aria-hidden="true" />
      </span>
    </Link>
  );
}

function ColorBlock({ item, index, className = "" }: { item: Item; index: number; className?: string }) {
  return (
    <Link
      href={item.href}
      className={`flex min-h-28 items-end justify-between gap-2 rounded-2xl p-5 font-display text-lg font-semibold transition-opacity hover:opacity-90 ${BLOCK_COLORS[index % BLOCK_COLORS.length]} ${className}`}
    >
      {item.label} <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

// Mosaico del home: fotos de categoría, bloque de reposición y bloques de color por uso y tipo de lente.
// `uses` y `needs` son pares [valor, etiqueta] ya filtrados por las facetas del catálogo.
export function HomeMosaic({ hasFrames, uses, needs }: { hasFrames: boolean; uses: [string, string][]; needs: [string, string][] }) {
  const frames: Item = { href: "/armazones", label: t("common.frames") };
  const lenses: Item = { href: "/lentes", label: t("common.contactLenses") };

  const photo = NEED_PHOTOS.find((p) => needs.some(([v]) => v === p.need));
  const photoNeed = needs.find(([v]) => v === photo?.need);
  const items: Item[] = [
    ...uses.map(([v, label]) => ({ href: `/lentes?replacement=${v}`, label })),
    ...needs.filter(([v]) => v !== photo?.need).map(([v, label]) => ({ href: `/lentes?lens_type=${v}`, label })),
  ];
  // Con foto, la segunda fila lleva bloque, foto y bloque; sin foto, tres bloques.
  const rowCount = photo ? 2 : 3;
  const row = items.slice(0, rowCount);
  const rest = items.slice(rowCount);

  return (
    <section aria-label={t("home.categoriesLabel")} className="container-page space-y-4 pt-10 pb-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:grid-rows-[15rem_15rem]">
        <PhotoTile
          item={hasFrames ? frames : lenses}
          src={hasFrames ? "/home/armazones.jpg" : "/home/lentes.jpg"}
          alt={hasFrames ? t("home.photos.frames") : t("home.photos.lenses")}
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="aspect-[4/3] lg:row-span-2 lg:aspect-auto"
        />
        {hasFrames && (
          <PhotoTile item={lenses} src="/home/lentes.jpg" alt={t("home.photos.lenses")} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[16/9] lg:aspect-auto" />
        )}
        <Link
          href="/cuenta/pedidos"
          className={`flex flex-col justify-between gap-4 rounded-2xl bg-mint p-6 text-navy transition-opacity hover:opacity-90 ${hasFrames ? "" : "lg:row-span-2"}`}
        >
          <RefreshCw className="size-10" aria-hidden="true" />
          <span className="space-y-1">
            <span className="block font-display text-2xl font-extrabold">{t("home.reorderBlock")}</span>
            <span className="block text-sm">{t("home.reorderBlockSub")}</span>
          </span>
        </Link>
      </div>

      {(row.length > 0 || photo) && (
        <div className={`grid grid-cols-2 gap-4 ${ROW_COLS[row.length + (photo ? 1 : 0)]}`}>
          {photo && photoNeed ? (
            <>
              {row[0] && <ColorBlock item={row[0]} index={0} />}
              <PhotoTile
                item={{ href: `/lentes?lens_type=${photo.need}`, label: photoNeed[1] }}
                src={photo.src}
                alt={photo.alt}
                sizes="(min-width: 600px) 33vw, 100vw"
                className="order-first col-span-2 aspect-[16/9] sm:order-none sm:col-span-1 sm:aspect-auto sm:min-h-44"
              />
              {row[1] && <ColorBlock item={row[1]} index={3} />}
            </>
          ) : (
            row.map((item, i) => <ColorBlock key={item.href} item={item} index={i} />)
          )}
        </div>
      )}

      {rest.length > 0 && (
        <ul className={`grid grid-cols-2 gap-4 ${REST_COLS[Math.min(rest.length, 4)]}`}>
          {rest.map((item, i) => (
            <li key={item.href}>
              <ColorBlock item={item} index={i + 1} className="h-full min-h-20 text-base" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
