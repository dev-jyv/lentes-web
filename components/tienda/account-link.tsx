"use client";

import { Popover } from "@base-ui/react/popover";
import type { User } from "@supabase/supabase-js";
import { cn } from "cn";
import { ChevronDown, FileText, LogOut, Package, UserRound, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

// El formulario (Turnstile, zod, react-hook-form) se descarga solo al abrir el popover.
const LoginForm = dynamic(() => import("@/components/auth/auth-forms").then((m) => m.LoginForm), { ssr: false });

const control = "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent lg:px-3";
// Marca de color bajo el control mientras su panel está abierto.
const openMark = "relative after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-popup-open:after:opacity-100";
const panel = "z-50 rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none";
const entry = "flex min-h-14 w-full items-center gap-3 border-b px-5 text-left text-base outline-none hover:bg-accent focus-visible:bg-accent";
const entries = [
  { href: "/cuenta", icon: UserRound, label: "account.title" },
  { href: "/cuenta/pedidos", icon: Package, label: "account.orders" },
  { href: "/cuenta/recetas", icon: FileText, label: "account.prescriptions" },
] as const;

// La sesión se lee en el navegador para no volver dinámicas las páginas del catálogo.
export function AccountLink() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  useEffect(() => {
    if (!env.supabaseUrl) return;
    const { data } = createClient().auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const name = String(user?.user_metadata?.full_name ?? "").trim();
  const first = name.split(/\s+/)[0].slice(0, 16);
  const label = (
    <>
      <UserRound className="size-6" aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">{user ? first || t("account.title") : t("nav.signIn")}</span>
      <ChevronDown className="hidden size-4 lg:block" aria-hidden="true" />
    </>
  );
  // Sin sesión, en móvil (y sin Supabase) el control es un enlace, sin popover.
  const link = (
    <Link href="/login" className={cn(control, env.supabaseUrl && "lg:hidden")}>
      {label}
    </Link>
  );
  if (!env.supabaseUrl) return link;

  return (
    <>
      {!user && link}
      {user ? (
        <Sheet open={open} onOpenChange={(o) => {
          setOpen(o);
          setSignOutFailed(false);
        }}>
          <SheetTrigger className={cn(control, openMark, "flex")}>{label}</SheetTrigger>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="gap-0 data-[side=right]:w-full data-[side=right]:min-[600px]:w-100 data-[side=right]:sm:max-w-none"
          >
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <SheetTitle className="min-w-0 flex-1 truncate text-lg font-bold">
                {name ? t("account.greetingName", { name }) : t("account.greeting")}
              </SheetTitle>
              <SheetClose aria-label={t("common.close")} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-accent">
                <X className="size-5" aria-hidden="true" />
              </SheetClose>
            </div>
            <nav aria-label={t("account.title")}>
              {entries.map(({ href, icon: Icon, label: key }) => (
                <Link key={href} href={href} className={entry} onClick={() => setOpen(false)}>
                  <Icon className="size-5" aria-hidden="true" />
                  {t(key)}
                </Link>
              ))}
              <button type="button" className={entry} onClick={async () => {
                setSignOutFailed(false);
                // signOut() devuelve el error en vez de lanzarlo, salvo fallas de red.
                const failed = await createClient().auth.signOut().then((r) => !!r.error, () => true);
                if (failed) return setSignOutFailed(true);
                setOpen(false);
                router.refresh();
              }}>
                <LogOut className="size-5" aria-hidden="true" />
                {t("auth.signOut")}
              </button>
            </nav>
            {signOutFailed && <p role="alert" className="px-5 py-3 text-sm text-destructive">{t("account.signOutError")}</p>}
          </SheetContent>
        </Sheet>
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
