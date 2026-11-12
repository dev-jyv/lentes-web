"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Circle, Eye, Gem, Glasses, Layers, MonitorSmartphone, Palette, Sun, SunDim, SunMoon, X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PrescriptionForm } from "@/components/cuenta/prescription-form";
import { useCatalog } from "@/components/catalog-provider";
import { useCartDrawer } from "@/components/tienda/cart-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addCartItem, getGetCartQueryKey } from "@/lib/api/generated/api";
import type {
  FrameVariant, LensPackage, LensTreatment, ProductDetail, TreatmentIcon, VisionType,
} from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { env } from "@/lib/env";
import { formatMxn, productHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";
import { createClient } from "@/lib/supabase/client";

type Step = "need" | "treatment" | "rx";
type RxChoice = "upload" | "later";
type Session = "unknown" | "in" | "out" | "expired";

const visionIcon: Record<VisionType, LucideIcon> = {
  frame_only: Glasses, none: Circle, single_vision: Eye, progressive: Layers,
};
const treatmentIcon: Record<TreatmentIcon, LucideIcon> = {
  anti_reflective: SunDim, color: Palette, blue_light: MonitorSmartphone, premium: Gem, photochromic: SunMoon, polarized: Sun,
};
const stepTitle: Record<Step, string> = {
  need: t("frames.configurator.steps.need"),
  treatment: t("frames.configurator.steps.treatment"),
  rx: t("frames.configurator.steps.rx"),
};

// Selección guardada al ir a iniciar sesión desde el paso de receta; se restaura al volver a la ficha.
// Solo ids de catálogo: nunca datos de receta.
const STORAGE_KEY = "lentes:lens-config";
type Stored = { slug: string; variantId: string; packageId: string; treatmentId: string | null };

function saveSelection(s: Stored) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Sin almacenamiento (modo privado) se pierde la selección, no la compra.
  }
}

function takeSelection(slug: string): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const s = JSON.parse(raw) as Stored;
    return s.slug === slug ? s : null;
  } catch {
    return null;
  }
}

// Tratamientos que aplican a una necesidad; "Solo armazón" nunca lleva.
const treatmentsFor = (all: LensTreatment[], p?: LensPackage) =>
  !p || p.vision_type === "frame_only" ? [] : all.filter((x) => x.vision_types.includes(p.vision_type));

const stepsFor = (all: LensTreatment[], p?: LensPackage): Step[] => [
  "need",
  ...(treatmentsFor(all, p).length > 0 ? ["treatment" as const] : []),
  ...(p?.requires_prescription ? ["rx" as const] : []),
];

const extraPrice = (cents: number) =>
  cents === 0 ? t("frames.configurator.free") : t("frames.configurator.extra", { price: formatMxn(cents) });

function OptionCard({ name, value, checked, onChange, icon: Icon, title, description, badge, price, note }: {
  name: string; value: string; checked: boolean; onChange: () => void; icon: LucideIcon;
  title: string; description?: string | null; badge?: string | null; price: ReactNode; note?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-sm transition-colors hover:border-primary/60 has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-base">{title}</strong>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </span>
        {description && <span className="block text-muted-foreground">{description}</span>}
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
      </span>
      <strong className="shrink-0 text-right">{price}</strong>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="shrink-0 font-medium">{value}</dd>
    </div>
  );
}

export function LensConfigurator({ product, packages, variant, onRestoreVariant }: {
  product: ProductDetail;
  packages: LensPackage[];
  variant: FrameVariant | undefined;
  onRestoreVariant: (id: string) => void;
}) {
  const treatments = product.lens_treatments;
  const catalog = useCatalog();
  const cartDrawer = useCartDrawer();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("need");
  const [packageId, setPackageId] = useState<string | undefined>();
  const [treatmentId, setTreatmentId] = useState<string | undefined>();
  const [rxChoice, setRxChoice] = useState<RxChoice | undefined>();
  const [rxUploaded, setRxUploaded] = useState(false);
  // Sin Supabase no hay sesión posible; con él, se sabe al suscribirse.
  const [session, setSession] = useState<Session>(env.supabaseUrl ? "unknown" : "out");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const pack = packages.find((p) => p.id === packageId);
  const applicable = treatmentsFor(treatments, pack);
  const treatment = applicable.find((x) => x.id === treatmentId);
  const steps = stepsFor(treatments, pack);
  // Antes de elegir necesidad, el total de pasos es el del camino más largo posible.
  const total = pack ? steps.length : Math.max(...packages.map((p) => stepsFor(treatments, p).length));
  const index = Math.max(0, steps.indexOf(step));
  const last = index === steps.length - 1 && !!pack;
  const color = variant ? catalog.label("frame_color", variant.color) : null;

  // Sesión leída en el navegador, como en el header, para no volver dinámica la ficha.
  useEffect(() => {
    if (!env.supabaseUrl) return;
    const { data } = createClient().auth.onAuthStateChange((_event, s) =>
      setSession((prev) => (s ? "in" : prev === "expired" ? "expired" : "out")));
    return () => data.subscription.unsubscribe();
  }, []);

  // Al volver de iniciar sesión se reabre el panel en el paso de receta con lo que se había elegido.
  // Se lee después de hidratar (siguiente cuadro) para no desalinear el HTML del servidor.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = takeSelection(product.slug);
      if (!saved || !packages.some((p) => p.id === saved.packageId)) return;
      onRestoreVariant(saved.variantId);
      setPackageId(saved.packageId);
      setTreatmentId(saved.treatmentId ?? undefined);
      setRxChoice("upload");
      setStep("rx");
      setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [product.slug, packages, onRestoreVariant]);

  function goTo(next: Step) {
    setError(null);
    setStep(next);
    // El título del paso recibe el foco para que el lector de pantalla anuncie el cambio.
    requestAnimationFrame(() => heading.current?.focus());
  }

  function pickPackage(p: LensPackage) {
    setPackageId(p.id);
    setError(null);
    if (!treatmentsFor(treatments, p).some((x) => x.id === treatmentId)) setTreatmentId(undefined);
    if (!p.requires_prescription) setRxChoice(undefined);
  }

  function remember() {
    if (variant && pack) saveSelection({ slug: product.slug, variantId: variant.id, packageId: pack.id, treatmentId: treatment?.id ?? null });
  }

  // Qué falta en el paso actual para poder avanzar; `null` si está completo.
  function missing(): string | null {
    if (step === "need" && !pack) return t("frames.configurator.chooseNeed");
    if (step === "treatment" && !treatment) return t("frames.configurator.chooseTreatment");
    if (step === "rx") {
      if (!rxChoice) return t("frames.configurator.chooseRx");
      if (rxChoice === "upload" && !rxUploaded) return t("frames.configurator.uploadFirst");
    }
    return null;
  }

  async function add() {
    if (!variant || !pack) return;
    setAdding(true);
    setError(null);
    const res = await addCartItem({
      variant_id: variant.id, eye: "both", quantity: 1, lens_package_id: pack.id, lens_treatment_id: treatment?.id ?? null,
    }).catch(() => null);
    await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    setAdding(false);
    if (res?.status !== 201) {
      // 400 (combinación inválida) y 409 (existencias) traen `detail` en español apto para el cliente.
      const detail = (res?.data as { detail?: string } | undefined)?.detail;
      return setError((res?.status === 400 || res?.status === 409) && detail ? detail : t("frames.addFailed"));
    }
    track("add_to_cart", {
      slug: product.slug, name: product.name, category: "frame", lens_package: pack.slug, lens_treatment: treatment?.slug ?? null,
    });
    setOpen(false);
    setStep("need");
    setPackageId(undefined);
    setTreatmentId(undefined);
    setRxChoice(undefined);
    setRxUploaded(false);
    cartDrawer.open();
  }

  function next() {
    const why = missing();
    if (why) return setError(why);
    if (last) return void add();
    goTo(steps[index + 1]);
  }

  const frameCents = variant?.price_cents ?? 0;
  const cheapest = (p: LensPackage) => {
    const prices = treatmentsFor(treatments, p).map((x) => x.price_cents);
    return prices.length > 0 ? Math.min(...prices) : null;
  };
  const subtotal = frameCents + (pack?.price_cents ?? 0) + (treatment?.price_cents ?? 0);
  const loginHref = `/login?next=${encodeURIComponent(productHref(product))}`;
  const loginLink = (c: ReactNode) => (
    <Link href={loginHref} onClick={remember} className="font-medium text-primary underline">{c}</Link>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setStep("need");
        setError(null);
      }
    }}>
      <SheetTrigger
        render={<Button size="lg" className="w-full" />}
        disabled={!variant?.in_stock}
      >
        {t("frames.configurator.open")}
      </SheetTrigger>
      {!variant?.in_stock && <p className="text-sm text-warn">{t("frames.configurator.soldOut")}</p>}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:min-[600px]:w-120 data-[side=right]:sm:max-w-none"
      >
        <div className="flex items-center gap-2 border-b px-3 py-3">
          {index > 0 ? (
            <button type="button" aria-label={t("frames.configurator.back")} onClick={() => goTo(steps[index - 1])}
              className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-accent">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="size-11 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs text-muted-foreground">{t("frames.configurator.stepOf", { current: index + 1, total })}</p>
            <SheetTitle render={<h2 ref={heading} tabIndex={-1} />} className="truncate text-lg font-bold outline-none">
              {stepTitle[step]}
            </SheetTitle>
          </div>
          <SheetClose aria-label={t("common.close")} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-accent">
            <X className="size-5" aria-hidden="true" />
          </SheetClose>
        </div>
        <div
          role="progressbar"
          aria-label={t("frames.configurator.progress")}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-valuetext={t("frames.configurator.stepOf", { current: index + 1, total })}
          className="h-1 bg-secondary"
        >
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <SheetDescription className="sr-only">{t("frames.configurator.description")}</SheetDescription>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === "need" && (
            <fieldset className="space-y-3">
              <legend className="sr-only">{stepTitle.need}</legend>
              {packages.map((p) => {
                const min = cheapest(p);
                const price = frameCents + p.price_cents + (min ?? 0);
                return (
                  <OptionCard
                    key={p.id} name="necesidad" value={p.id} checked={packageId === p.id} onChange={() => pickPackage(p)}
                    icon={visionIcon[p.vision_type]} title={p.name} description={p.description} badge={p.badge}
                    note={p.requires_prescription ? t("frames.configurator.requiresPrescription") : undefined}
                    // "Solo armazón" y las necesidades sin tratamientos muestran el total exacto; las demás, "desde".
                    price={min == null ? formatMxn(price) : t("frames.configurator.from", { price: formatMxn(price) })}
                  />
                );
              })}
            </fieldset>
          )}

          {step === "treatment" && (
            <fieldset className="space-y-3">
              <legend className="sr-only">{stepTitle.treatment}</legend>
              {applicable.map((x) => (
                <OptionCard
                  key={x.id} name="tratamiento" value={x.id} checked={treatmentId === x.id}
                  onChange={() => { setTreatmentId(x.id); setError(null); }}
                  icon={treatmentIcon[x.icon] ?? SunDim} title={x.name} description={x.description} badge={x.badge}
                  price={extraPrice(x.price_cents)}
                />
              ))}
            </fieldset>
          )}

          {step === "rx" && (
            // La receta es dato de salud: fuera de las grabaciones de sesión.
            <div className="ph-no-capture space-y-4">
              <p className="text-sm text-muted-foreground">{t("frames.configurator.rx.intro")}</p>
              <fieldset className="space-y-3">
                <legend className="sr-only">{stepTitle.rx}</legend>
                <OptionCard
                  name="receta" value="upload" checked={rxChoice === "upload"} onChange={() => { setRxChoice("upload"); setError(null); }}
                  icon={Glasses} title={t("frames.configurator.rx.upload")} description={t("frames.configurator.rx.uploadHint")} price={null}
                />
                <OptionCard
                  name="receta" value="later" checked={rxChoice === "later"} onChange={() => { setRxChoice("later"); setError(null); }}
                  icon={Eye} title={t("frames.configurator.rx.later")} description={t("frames.configurator.rx.laterHint")} price={null}
                />
              </fieldset>
              {rxChoice === "upload" && (
                rxUploaded ? (
                  <p role="status" className="rounded-xl bg-secondary p-4 text-sm">{t("frames.configurator.rx.uploaded")}</p>
                ) : session === "in" ? (
                  <PrescriptionForm
                    kind="glasses"
                    onCreated={() => setRxUploaded(true)}
                    onUnauthorized={() => {
                      remember();
                      setSession("expired");
                    }}
                  />
                ) : session !== "unknown" && (
                  <p role={session === "expired" ? "alert" : undefined} className="rounded-xl bg-secondary p-4 text-sm">
                    {rich(t(session === "expired" ? "frames.configurator.rx.sessionExpired" : "frames.configurator.rx.signIn"), { link: loginLink })}
                  </p>
                )
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t bg-secondary p-5">
          <dl className="space-y-1 text-sm">
            <SummaryRow
              label={color ? t("frames.configurator.frameColor", { name: product.name, color }) : t("frames.configurator.frame", { name: product.name })}
              value={formatMxn(frameCents)}
            />
            {pack && (
              <SummaryRow
                label={pack.name}
                value={pack.price_cents === 0 ? t("frames.configurator.included") : t("frames.configurator.extra", { price: formatMxn(pack.price_cents) })}
              />
            )}
            {treatment && <SummaryRow label={treatment.name} value={extraPrice(treatment.price_cents)} />}
          </dl>
          <p className="flex items-baseline justify-between border-t pt-3">
            <span>{t("frames.configurator.subtotal")}</span>
            <strong className="font-display text-xl">{formatMxn(subtotal)}</strong>
          </p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="w-full" disabled={adding || !variant?.in_stock} onClick={next}>
            {adding ? t("frames.adding") : last ? t("frames.addToCart") : t("frames.configurator.continue")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
