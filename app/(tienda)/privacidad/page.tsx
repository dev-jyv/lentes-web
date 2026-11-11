import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL_REVIEWED } from "@/lib/legal";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("legal.privacy.title"),
  description: t("legal.privacy.description"),
  // Borrador sin revisión legal: fuera de buscadores (lib/legal.ts).
  ...(!LEGAL_REVIEWED && { robots: { index: false } }),
};

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
