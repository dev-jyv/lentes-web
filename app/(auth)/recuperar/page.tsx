import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecoverPage() {
  return (
    <AuthShell title="Recuperar contraseña">
      <RecoverForm />
    </AuthShell>
  );
}
