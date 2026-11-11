"use client";

import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import type { User } from "@supabase/supabase-js";
import { cn } from "cn";
import { ChevronDown, UserRound, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

// El formulario (Turnstile, zod, react-hook-form) se descarga solo al abrir el popover.
const LoginForm = dynamic(() => import("@/components/auth/auth-forms").then((m) => m.LoginForm), { ssr: false });

const control = "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent lg:px-3";
// Marca de color bajo el control mientras su panel está abierto.
const openMark = "relative after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-popup-open:after:opacity-100";
const panel = "z-50 rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none";
const item = "flex min-h-10 w-full items-center rounded-lg px-3 text-sm outline-none data-highlighted:bg-accent";

// La sesión se lee en el navegador para no volver dinámicas las páginas del catálogo.
export function AccountLink() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!env.supabaseUrl) return;
    const { data } = createClient().auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const first = String(user?.user_metadata?.full_name ?? "").trim().split(/\s+/)[0].slice(0, 16);
  const label = (
    <>
      <UserRound className="size-6" aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">{user ? first || t("account.title") : t("nav.signIn")}</span>
      <ChevronDown className="hidden size-4 lg:block" aria-hidden="true" />
    </>
  );
  // En móvil (y sin Supabase) el control es un enlace, sin popover.
  const link = (
    <Link href={user ? "/cuenta" : "/login"} className={cn(control, env.supabaseUrl && "lg:hidden")}>
      {label}
    </Link>
  );
  if (!env.supabaseUrl) return link;

  return (
    <>
      {link}
      {user ? (
        <Menu.Root>
          <Menu.Trigger className={cn(control, openMark, "hidden lg:flex")}>{label}</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="end" sideOffset={8} className="z-50">
              <Menu.Popup className={cn(panel, "min-w-48 p-1")}>
                <Menu.LinkItem closeOnClick className={item} render={<Link href="/cuenta" />}>{t("account.title")}</Menu.LinkItem>
                <Menu.LinkItem closeOnClick className={item} render={<Link href="/cuenta/pedidos" />}>{t("account.orders")}</Menu.LinkItem>
                <Menu.LinkItem closeOnClick className={item} render={<Link href="/cuenta/recetas" />}>{t("account.prescriptions")}</Menu.LinkItem>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item className={item} onClick={async () => {
                  await createClient().auth.signOut();
                  router.refresh();
                }}>
                  {t("auth.signOut")}
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : (
        <Popover.Root modal="trap-focus" open={open} onOpenChange={(o) => {
          setOpen(o);
          if (o) setLoaded(true);
        }}>
          <Popover.Trigger className={cn(control, openMark, "hidden lg:flex")}>{label}</Popover.Trigger>
          {/* Montado tras la primera apertura: un clic fuera conserva lo escrito. */}
          <Popover.Portal keepMounted={loaded}>
            <Popover.Positioner align="end" sideOffset={8} className="z-50">
              {/* Ancho fijo; Turnstile solo puede hacerlo crecer en alto. */}
              <Popover.Popup
                className={cn(panel, "max-h-(--available-height) w-88 overflow-y-auto p-5 [--field-bg:var(--popover)] data-closed:hidden")}
                onClick={(e) => (e.target as Element).closest("a") && setOpen(false)}
              >
                <div className="mb-4 flex items-center justify-between">
                  <Popover.Title className="text-lg font-bold">{t("auth.login.title")}</Popover.Title>
                  <Popover.Close aria-label={t("common.close")} className="flex size-8 items-center justify-center rounded-full hover:bg-accent">
                    <X className="size-4" aria-hidden="true" />
                  </Popover.Close>
                </div>
                {loaded && <LoginForm onSuccess={() => setOpen(false)} />}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
    </>
  );
}
