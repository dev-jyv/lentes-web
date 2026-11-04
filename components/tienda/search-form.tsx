import { Search } from "lucide-react";
import { t } from "@/lib/i18n";

// Formulario GET: funciona sin JavaScript.
export function SearchForm({ className = "", id }: { className?: string; id: string }) {
  return (
    <form action="/buscar" method="get" role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">{t("search.label")}</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="search"
        name="q"
        required
        minLength={2}
        maxLength={80}
        autoComplete="off"
        placeholder={t("search.placeholder")}
        className="h-11 w-full rounded-full border border-border bg-muted/50 pr-4 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </form>
  );
}
