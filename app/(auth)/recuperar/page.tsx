import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverForm } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.recover.title"), robots: { index: false } };

export default function RecoverPage() {
  return (
    <AuthShell title={t("auth.recover.title")}>
      <RecoverForm />
    </AuthShell>
  );
}
