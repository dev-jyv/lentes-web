import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";

export default function NewPasswordPage() {
  return (
    <AuthShell title={t("auth.newPassword.title")}>
      <NewPasswordForm />
    </AuthShell>
  );
}
