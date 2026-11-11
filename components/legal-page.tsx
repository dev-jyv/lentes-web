import { LEGAL_REVIEWED } from "@/lib/legal";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const bold = { b: (c: string) => <strong>{c}</strong> };

// Texto legal desde messages/es-MX.json (legal.terms.* y legal.privacy.*).
export function LegalPage({ doc }: { doc: "terms" | "privacy" }) {
  const sections = doc === "terms"
    ? t("legal.terms.sections", { returnObjects: true })
    : t("legal.privacy.sections", { returnObjects: true });
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      {!LEGAL_REVIEWED && (
        <p role="note" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {t("legal.draftNotice")}
        </p>
      )}
      <h1 className="text-3xl">{t(doc === "terms" ? "legal.terms.title" : "legal.privacy.title")}</h1>
      {sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-xl">{s.title}</h2>
          {s.body.map((p, i) => <p key={i}>{rich(p, bold)}</p>)}
        </section>
      ))}
    </div>
  );
}
