import Link from "next/link";
import type { Brand } from "@/lib/api/generated/model";
import { lensTypeLabel, replacementLabel } from "@/lib/format";

type Params = { brand?: string; lens_type?: string; replacement?: string };

function href(base: string, params: Params, key: keyof Params, value?: string) {
  const next = { ...params, [key]: value };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

function Group({
  title, base, params, name, options,
}: {
  title: string; base: string; params: Params; name: keyof Params;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="optic text-[11px] font-medium tracking-widest text-muted-foreground uppercase">{title}</h3>
      <ul className="space-y-1 text-sm">
        <li>
          <Link href={href(base, params, name)} className={!params[name] ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}>
            Todos
          </Link>
        </li>
        {options.map((o) => (
          <li key={o.value}>
            <Link
              href={href(base, params, name, o.value)}
              className={params[name] === o.value ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}
            >
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CatalogFilters({
  base = "/lentes", params, brands,
}: { base?: string; params: Params; brands: Brand[] }) {
  return (
    <aside aria-label="Filtros" className="space-y-6 md:sticky md:top-28 md:self-start">
      {base === "/lentes" && (
        <Group title="Marca" base={base} params={params} name="brand"
          options={brands.map((b) => ({ value: b.slug, label: b.name }))} />
      )}
      <Group title="Tipo" base={base} params={params} name="lens_type"
        options={Object.entries(lensTypeLabel).map(([value, label]) => ({ value, label }))} />
      <Group title="Reemplazo" base={base} params={params} name="replacement"
        options={Object.entries(replacementLabel).map(([value, label]) => ({ value, label }))} />
    </aside>
  );
}

const labels: Record<string, Record<string, string>> = { lens_type: lensTypeLabel, replacement: replacementLabel };

// Chips de los filtros activos; cada uno quita su filtro.
export function ActiveFilters({
  base = "/lentes", params, brands,
}: { base?: string; params: Params; brands: Brand[] }) {
  const chips = (Object.keys(params) as (keyof Params)[])
    .filter((k) => params[k])
    .map((k) => ({
      key: k,
      label: k === "brand" ? (brands.find((b) => b.slug === params[k])?.name ?? params[k]!) : (labels[k]?.[params[k]!] ?? params[k]!),
    }));
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filtros activos" className="mb-4 flex flex-wrap gap-2">
      {chips.map((c) => (
        <li key={c.key}>
          <Link
            href={href(base, params, c.key)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium hover:bg-accent"
            aria-label={`Quitar filtro ${c.label}`}
          >
            {c.label} <span aria-hidden="true">×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
