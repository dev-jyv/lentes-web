import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.register.title"), robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell title={t("auth.register.title")}>
      <RegisterForm />
    </AuthShell>
  );
}
