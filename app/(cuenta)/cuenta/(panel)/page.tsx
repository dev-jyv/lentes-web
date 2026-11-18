import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/auth-forms";
import { AccountOverview } from "@/components/cuenta/account-overview";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.title"), robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl">{t("account.title")}</h1>
      <AccountOverview />
      <div className="border-t pt-6 lg:hidden"><SignOutButton /></div>
    </div>
  );
}
