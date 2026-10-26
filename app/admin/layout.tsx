import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/recetas");
  // Solo app_metadata (nunca user_metadata). La API vuelve a verificar el rol en cada llamada.
  if (user.app_metadata?.role !== "admin") notFound();
  return <div className="mx-auto max-w-5xl px-4 py-10">{children}</div>;
}
