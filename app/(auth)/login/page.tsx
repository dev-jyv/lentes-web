import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.login.title"), robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthShell title={t("auth.tabs.title")} subtitle={t("auth.login.subtitle")}>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("auth.login.oauthFailed")}
        </p>
      )}
      <AuthTabs initial="login" next={next} />
    </AuthShell>
  );
}
