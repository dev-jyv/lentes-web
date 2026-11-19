import { FileText, Heart, Package, RotateCcw } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { t } from "@/lib/i18n";

const perks = [
  { icon: FileText, key: "prescriptions" },
  { icon: Package, key: "orders" },
  { icon: RotateCcw, key: "reorder" },
  { icon: Heart, key: "favorites" },
] as const;

// Acceso dividido: panel de marca en escritorio y tarjeta con el formulario. En móvil solo la tarjeta.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-8 lg:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl lg:grid-cols-2 lg:border lg:bg-card lg:shadow-sm">
        <aside className="relative hidden overflow-hidden bg-band p-10 text-white lg:flex lg:flex-col lg:justify-between">
          {/* Iris decorativo de la marca, recortado en la esquina. */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full border border-white/10">
            <div className="absolute inset-12 rounded-full border border-white/10" />
            <div className="absolute inset-28 rounded-full bg-blue-vivid/25 blur-2xl" />
          </div>
          <BrandMark className="size-12" />
          <div className="relative space-y-6">
            <p className="font-display text-3xl leading-tight font-bold text-balance">{t("auth.shell.title")}</p>
            <ul className="space-y-3">
              {perks.map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-3 text-white/85">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10">
                    <Icon className="size-4 text-mint" aria-hidden="true" />
                  </span>
                  {t(`auth.shell.perks.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <div className="mx-auto w-full max-w-md px-1 py-2 sm:px-0 lg:px-10 lg:py-12">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
