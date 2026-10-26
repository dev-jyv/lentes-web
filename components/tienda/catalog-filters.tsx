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
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="space-y-1 text-sm">
        <li>
          <Link href={href(base, params, name)} className={!params[name] ? "font-semibold" : "text-muted-foreground hover:underline"}>
            Todos
          </Link>
        </li>
        {options.map((o) => (
          <li key={o.value}>
            <Link
              href={href(base, params, name, o.value)}
              className={params[name] === o.value ? "font-semibold" : "text-muted-foreground hover:underline"}
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
    <aside className="space-y-6">
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
