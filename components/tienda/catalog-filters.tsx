import Link from "next/link";
import type { FilterOption } from "@/lib/catalog";
import { t } from "@/lib/i18n";

type FilterParams = Record<string, string | undefined>;

export type FilterGroup = {
  title: string;
  name: string;
  // Una opción `chipOnly` (valor oculto del catálogo) solo da la etiqueta de su chip.
  options: FilterOption[];
  // Solo aporta la etiqueta de su chip: no se muestra en la barra lateral.
  chipOnly?: boolean;
};

function href(base: string, params: FilterParams, key: string, value?: string) {
  const next = { ...params, [key]: value };
  const qs = new URLSearchParams(
    Object.entries(next).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

function Group({ group, base, params }: { group: FilterGroup; base: string; params: FilterParams }) {
  const { title, name, options } = group;
  return (
    <div className="space-y-2">
      <h3 className="optic text-[11px] font-medium tracking-widest text-muted-foreground uppercase">{title}</h3>
      <ul className="space-y-1 text-sm">
        <li>
          <Link href={href(base, params, name)} className={!params[name] ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}>
            {t("catalog.all")}
          </Link>
        </li>
        {options.filter((o) => !o.chipOnly).map((o) => (
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
  base, params, groups,
}: { base: string; params: FilterParams; groups: FilterGroup[] }) {
  return (
    <aside aria-label={t("catalog.filtersLabel")} className="space-y-6 md:sticky md:top-28 md:self-start">
      {groups.filter((g) => !g.chipOnly && g.options.some((o) => !o.chipOnly)).map((g) => <Group key={g.name} group={g} base={base} params={params} />)}
    </aside>
  );
}

// Chips de los filtros activos; cada uno quita su filtro.
export function ActiveFilters({
  base, params, groups,
}: { base: string; params: FilterParams; groups: FilterGroup[] }) {
  const chips = Object.keys(params)
    .filter((k) => params[k])
    .map((k) => ({
      key: k,
      label: groups.find((g) => g.name === k)?.options.find((o) => o.value === params[k])?.label ?? params[k]!,
    }));
  if (chips.length === 0) return null;
  return (
    <ul aria-label={t("catalog.activeFiltersLabel")} className="mb-4 flex flex-wrap gap-2">
      {chips.map((c) => (
        <li key={c.key}>
          <Link
            href={href(base, params, c.key)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium hover:bg-accent"
            aria-label={t("catalog.removeFilter", { label: c.label })}
          >
            {c.label} <span aria-hidden="true">×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
