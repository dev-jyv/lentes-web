import { ArrowRight, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { HomeContent } from "@/lib/api/generated/model";
import { imageSrc } from "@/lib/images";
import { t } from "@/lib/i18n";

type Item = { href: string; label: string };
type Photo = { src: string; alt: string };

// Contenido administrable del mosaico (SPEC 15): foto por `slot` y bloque de reposición.
// La etiqueta y el enlace de cada celda con foto salen del catálogo, no del banner.
export type MosaicContent = {
  photos: Partial<Record<string, Photo>>;
  reorder: { title: string; subtitle: string | null } | null;
};

// Contenido de código: solo se usa si GET /v1/home falla (SPEC 15, punto 22).
const FALLBACK: MosaicContent = {
  photos: {
    frames: { src: "/home/armazones.jpg", alt: t("home.photos.frames") },
    contact_lens: { src: "/home/lentes.jpg", alt: t("home.photos.lenses") },
    "lens_type:toric": { src: "/home/toricos.jpg", alt: t("home.photos.toric") },
    "lens_type:multifocal": { src: "/home/multifocales.jpg", alt: t("home.photos.multifocal") },
    "lens_type:spherical": { src: "/home/esfericos.jpg", alt: t("home.photos.spherical") },
  },
  reorder: { title: t("home.reorderBlock"), subtitle: t("home.reorderBlockSub") },
};

// Un slot sin banner vigente o con imagen inválida queda sin foto: su celda se dibuja como bloque de color.
// Sin banner `reorder` vigente, el bloque de reposición no aparece.
export function mosaicContent(home: HomeContent | null): MosaicContent {
  if (!home) return FALLBACK;
  const photos: Record<string, Photo> = {};
  for (const [slot, banner] of Object.entries(home.mosaic)) {
    const src = imageSrc(banner.image_url);
    if (slot !== "reorder" && src) photos[slot] = { src, alt: banner.image_alt ?? "" };
  }
  const reorder = home.mosaic.reorder;
  return { photos, reorder: reorder ? { title: reorder.title, subtitle: reorder.subtitle } : null };
}

// Tipos de lente en orden de preferencia para la celda con foto de la segunda fila.
const LENS_TYPE_PHOTO_ORDER = ["toric", "multifocal", "spherical", "cosmetic"];

// Parejas fijas de fondo y texto: el blanco solo va sobre azul oscuro o marino (spec 2026-11-05).
const BLOCK_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-mint text-navy",
  "bg-navy text-white",
  "bg-sun text-navy",
];

// Columnas de la segunda fila según cuántos elementos haya, para que no quede hueco a la derecha.
const ROW_COLS = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"];
// En celular (2 columnas) un último elemento impar ocupa toda la fila.
const ORPHAN_FULL = "max-sm:[&>*:last-child:nth-child(odd)]:col-span-2";

function PhotoTile({ item, photo, sizes, className = "" }: { item: Item; photo: Photo; sizes: string; className?: string }) {
  return (
    <Link href={item.href} className={`group relative block overflow-hidden rounded-2xl bg-navy ${className}`}>
      <Image src={photo.src} alt={photo.alt} fill unoptimized sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-navy/85 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-5 font-display text-2xl font-extrabold text-white">
        {item.label} <ArrowRight className="size-6" aria-hidden="true" />
      </span>
    </Link>
  );
}

const BLOCK_SIZES = {
  large: "min-h-40 text-2xl font-extrabold",
  medium: "min-h-28 text-lg font-semibold",
};

function ColorBlock({ item, index, size = "medium", className = "" }: { item: Item; index: number; size?: keyof typeof BLOCK_SIZES; className?: string }) {
  return (
    <Link
      href={item.href}
      className={`flex items-end justify-between gap-2 rounded-2xl p-5 font-display transition-opacity hover:opacity-90 ${BLOCK_SIZES[size]} ${BLOCK_COLORS[index % BLOCK_COLORS.length]} ${className}`}
    >
      {item.label} <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

// Mosaico del home: fotos de categoría, bloque de reposición y bloques de color por uso y tipo de lente.
// `uses` y `needs` son pares [valor, etiqueta] ya filtrados por las facetas del catálogo.
export function HomeMosaic({ hasFrames, uses, needs, content }: {
  hasFrames: boolean;
  uses: [string, string][];
  needs: [string, string][];
  content: MosaicContent;
}) {
  const { photos, reorder } = content;
  const frames: Item = { href: "/armazones", label: t("common.frames") };
  const lenses: Item = { href: "/lentes", label: t("common.contactLenses") };

  // Un solo tipo de lente lleva foto en la segunda fila: el primero con productos y con foto vigente.
  const need = LENS_TYPE_PHOTO_ORDER.find((n) => needs.some(([v]) => v === n) && photos[`lens_type:${n}`]);
  const photo = need ? photos[`lens_type:${need}`] : undefined;
  const photoNeed = needs.find(([v]) => v === need);
  const items: Item[] = [
    ...uses.map(([v, label]) => ({ href: `/lentes?replacement=${v}`, label })),
    ...needs.filter(([v]) => v !== need).map(([v, label]) => ({ href: `/lentes?lens_type=${v}`, label })),
  ];
  // Con foto, la segunda fila lleva bloque, foto y bloque; sin foto, tres bloques.
  const rowCount = photo ? 2 : 3;
  const row = items.slice(0, rowCount);
  const rest = items.slice(rowCount);

  const main = hasFrames ? frames : lenses;
  const mainPhoto = photos[hasFrames ? "frames" : "contact_lens"];
  const lensPhoto = photos.contact_lens;
  // Celdas de la columna derecha de la primera fila; si queda una sola, ocupa las dos filas.
  const side = (hasFrames ? 1 : 0) + (reorder ? 1 : 0);
  const sideSpan = side === 1 ? "lg:row-span-2" : "";

  return (
    <section aria-label={t("home.categoriesLabel")} className="container-page space-y-4 pt-10 pb-4">
      <div className={`grid gap-4 lg:grid-rows-[15rem_15rem] ${side ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
        {mainPhoto ? (
          <PhotoTile item={main} photo={mainPhoto} sizes="(min-width: 1024px) 66vw, 100vw" className="aspect-[4/3] lg:row-span-2 lg:aspect-auto" />
        ) : (
          <ColorBlock item={main} index={0} size="large" className="lg:row-span-2" />
        )}
        {hasFrames && (lensPhoto ? (
          <PhotoTile item={lenses} photo={lensPhoto} sizes="(min-width: 1024px) 33vw, 100vw" className={`aspect-[16/9] lg:aspect-auto ${sideSpan}`} />
        ) : (
          <ColorBlock item={lenses} index={2} size="large" className={sideSpan} />
        ))}
        {reorder && (
          <Link
            href="/cuenta/pedidos"
            className={`flex flex-col justify-between gap-4 rounded-2xl bg-mint p-6 text-navy transition-opacity hover:opacity-90 ${sideSpan}`}
          >
            <RefreshCw className="size-10" aria-hidden="true" />
            <span className="space-y-1">
              <span className="block font-display text-2xl font-extrabold">{reorder.title}</span>
              {reorder.subtitle && <span className="block text-sm">{reorder.subtitle}</span>}
            </span>
          </Link>
        )}
      </div>

      {(row.length > 0 || photo) && (
        <div className={`grid grid-cols-2 gap-4 ${photo ? "" : ORPHAN_FULL} ${ROW_COLS[row.length + (photo ? 1 : 0)]}`}>
          {photo && photoNeed ? (
            <>
              {/* La foto va primero en celular; si solo la acompaña un bloque, ese bloque ocupa toda la fila. */}
              {row[0] && <ColorBlock item={row[0]} index={0} className={row.length === 1 ? "max-sm:col-span-2" : ""} />}
              <PhotoTile
                item={{ href: `/lentes?lens_type=${need}`, label: photoNeed[1] }}
                photo={photo}
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
        // Flex en lugar de grid: la última fila crece hasta llenar el ancho, sea cual sea el número de bloques.
        <ul className="flex flex-wrap gap-4">
          {rest.map((item, i) => (
            <li key={item.href} className="min-w-[calc(50%-0.5rem)] flex-1 md:min-w-[calc(25%-0.75rem)]">
              <ColorBlock item={item} index={i + 1} className="h-full" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
