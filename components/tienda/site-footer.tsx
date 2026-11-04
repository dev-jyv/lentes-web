import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { t } from "@/lib/i18n";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandMark className="size-6" />
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
        <nav aria-label={t("footer.label")} className="flex flex-wrap gap-5">
          <Link href="/armazones" className="hover:text-foreground">{t("common.frames")}</Link>
          <Link href="/lentes" className="hover:text-foreground">{t("common.contactLenses")}</Link>
          <Link href="/marcas" className="hover:text-foreground">{t("brands.title")}</Link>
          <Link href="/cuenta/recetas" className="hover:text-foreground">{t("nav.myPrescription")}</Link>
          <Link href="/cuenta" className="hover:text-foreground">{t("account.title")}</Link>
          <Link href="/cambios-y-devoluciones" className="hover:text-foreground">{t("returns.title")}</Link>
        </nav>
      </div>
    </footer>
  );
}
