import type { Metadata } from "next";
import { ProfileForm } from "@/components/cuenta/profile-form";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.profile.title"), robots: { index: false } };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Sin identidad de email no hay contraseña propia que cambiar.
  const identities = user?.identities ?? [];
  const googleOnly = identities.length > 0 && identities.every((i) => i.provider === "google");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl">{t("account.profile.title")}</h1>
      <ProfileForm googleOnly={googleOnly} />
    </div>
  );
}
