import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.register.title"), robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title={t("auth.tabs.title")}>
      <AuthTabs initial="register" next={next} />
    </AuthShell>
  );
}
