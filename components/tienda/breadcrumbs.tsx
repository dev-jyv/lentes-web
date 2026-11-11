import Link from "next/link";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href && { item: `${env.siteUrl}${c.href}` }),
    })),
  };

  return (
    <nav aria-label={t("common.breadcrumbs")} className="text-sm text-muted-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-foreground hover:underline">{c.label}</Link>
            ) : (
              <span aria-current="page" className="text-foreground">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
