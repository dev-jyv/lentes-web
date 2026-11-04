import type { Metadata } from "next";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("returns.title"),
  description: t("returns.description"),
};

export default function ReturnsPage() {
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl">{t("returns.title")}</h1>
      <section className="space-y-2">
        <h2 className="text-xl">{t("returns.frame.title")}</h2>
        <p>{t("returns.frame.body")}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl">{t("returns.lenses.title")}</h2>
        <p>
          {t("returns.lenses.body")}
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl">{t("returns.rejected.title")}</h2>
        <p>
          {t("returns.rejected.body")}
        </p>
      </section>
    </div>
  );
}
