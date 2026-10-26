import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthShell title="Iniciar sesión">
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          No pudimos completar el inicio de sesión. Intenta de nuevo.
        </p>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
