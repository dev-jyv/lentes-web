import { redirect } from "next/navigation";
import { AccountNav } from "@/components/cuenta/account-nav";
import { createClient } from "@/lib/supabase/server";

// Panel común de /cuenta (SPEC 21). /cuenta/contrasena queda fuera: es destino de la recuperación de contraseña.
export default async function AccountPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cuenta");
  const name = String(user.user_metadata?.full_name ?? "").trim();

  return (
    <div className="ph-no-capture container-page py-8 lg:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <AccountNav name={name.split(/\s+/)[0] || user.email || ""} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
