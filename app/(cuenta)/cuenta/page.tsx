import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/auth-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cuenta");

  return (
    <div className="ph-no-capture mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">Mi cuenta</h1>
      <p className="text-muted-foreground">{user.email}</p>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/cuenta/recetas">Mis recetas</Link>
      </nav>
      <SignOutButton />
    </div>
  );
}
