"use client";

import { cn } from "cn";
import { FileText, Heart, LayoutGrid, MapPin, Package, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SignOutButton } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";

export const accountSections = [
  { href: "/cuenta", icon: LayoutGrid, label: t("account.nav.overview") },
  { href: "/cuenta/perfil", icon: UserRound, label: t("account.nav.profile") },
  { href: "/cuenta/direcciones", icon: MapPin, label: t("account.nav.addresses") },
  { href: "/cuenta/pedidos", icon: Package, label: t("account.nav.orders") },
  { href: "/cuenta/recetas", icon: FileText, label: t("account.nav.prescriptions") },
  { href: "/cuenta/favoritos", icon: Heart, label: t("account.nav.favorites") },
] as const;

const isActive = (pathname: string, href: string) =>
  href === "/cuenta" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function AccountNav({ name }: { name: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // En móvil la barra se desliza: la sección activa queda a la vista al cargar. Solo se mueve la barra, no la página.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (nav && active) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.clientWidth) / 2;
  }, [pathname]);

  return (
    <aside className="lg:sticky lg:top-36 lg:h-fit">
      <p className="mb-4 hidden font-display text-xl lg:block">{t("account.hello", { name })}</p>
      <nav ref={navRef} aria-label={t("account.navLabel")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
        <ul className="flex gap-2 lg:flex-col lg:gap-1">
          {accountSections.map(({ href, icon: Icon, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-xl lg:border-transparent",
                    active ? "border-blue/30 bg-blue-soft text-blue" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-6 hidden border-t pt-6 lg:block"><SignOutButton /></div>
    </aside>
  );
}
