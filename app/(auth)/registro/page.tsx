import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell title="Crear cuenta">
      <RegisterForm />
    </AuthShell>
  );
}
