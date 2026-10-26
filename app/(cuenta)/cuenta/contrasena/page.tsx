import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/auth-forms";

export default function NewPasswordPage() {
  return (
    <AuthShell title="Nueva contraseña">
      <NewPasswordForm />
    </AuthShell>
  );
}
