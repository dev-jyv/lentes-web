import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { t } from "@/lib/i18n";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-band text-white">
      <div className="container-page flex flex-col gap-6 py-10 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandMark className="size-6" />
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
        <nav aria-label={t("footer.label")} className="flex flex-wrap gap-5">
          <Link href="/armazones" className="hover:text-white">{t("common.frames")}</Link>
          <Link href="/lentes" className="hover:text-white">{t("common.contactLenses")}</Link>
          <Link href="/marcas" className="hover:text-white">{t("brands.title")}</Link>
          <Link href="/cuenta/recetas" className="hover:text-white">{t("nav.myPrescription")}</Link>
          <Link href="/cuenta" className="hover:text-white">{t("account.title")}</Link>
          <Link href="/cambios-y-devoluciones" className="hover:text-white">{t("returns.title")}</Link>
        </nav>
      </div>
    </footer>
  );
}
