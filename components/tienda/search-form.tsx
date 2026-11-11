import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { t } from "@/lib/i18n";

type Props = { className?: string; id: string; inputProps?: ComponentProps<"input">; children?: ReactNode };

// Formulario GET: funciona sin JavaScript. `inputProps` y `children` los usa SearchSuggest para el combobox.
export function SearchForm({ className = "", id, inputProps, children }: Props) {
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
        {...inputProps}
        className="h-11 w-full rounded-full border border-border bg-muted/50 pr-11 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {children}
    </form>
  );
}
