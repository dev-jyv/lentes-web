"use client";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Check, ChevronDown, Lock, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressForm } from "@/components/cuenta/address-form";
import { FrameDetails, LineImage } from "@/components/tienda/cart-view";
import {
  createCheckout, getGetCartQueryKey, useGetCart, useListAddresses, useListPrescriptions,
} from "@/lib/api/generated/api";
import type { Address, Cart, Prescription } from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { formatLeadTime, formatMxn } from "@/lib/format";
import { imageSrc } from "@/lib/images";
import { isUsable, rxStatusLabel } from "@/lib/prescription";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

type StepKey = "address" | "prescription" | "payment";
type StepState = "done" | "current" | "pending";

// La API manda `detail` en español y apto para el cliente en 409 (existencias, receta, carrito vacío).
function checkoutMessage(status: number, detail?: string) {
  switch (status) {
    case 409:
      return detail ?? t("checkout.errors.unavailable");
    case 403:
      return t("checkout.errors.captcha");
    case 404:
      return t("checkout.errors.notFound");
    case 503:
      return t("checkout.errors.paymentsDown");
    default:
      return t("checkout.errors.generic");
  }
}

const addressLine = (a: Address) =>
  `${a.street} ${a.ext_number}${a.int_number ? t("checkout.address.interior", { number: a.int_number }) : ""}, ${a.neighborhood}, ${a.postal_code}`;
const rxLine = (r: Prescription) => `${r.doctor_name} · ${rxStatusLabel[r.status]}`;

// Tarjeta seleccionable: el radio nativo queda oculto a la vista pero sigue siendo el control accesible.
function ChoiceCard({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-sm transition-colors hover:border-blue/50 has-[:checked]:border-blue has-[:checked]:bg-blue-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
      <input type="radio" name={name} className="peer sr-only" checked={checked} onChange={onChange} />
      <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-input peer-checked:border-blue">
        <span className={cn("size-2.5 rounded-full bg-blue transition-transform", checked ? "scale-100" : "scale-0")} />
      </span>
      <span className="min-w-0 leading-relaxed">{children}</span>
    </label>
  );
}

function Stepper({ steps, states, onOpen }: { steps: { key: StepKey; label: string }[]; states: Record<StepKey, StepState>; onOpen: (k: StepKey) => void }) {
  return (
    <ol aria-label={t("checkout.stepsLabel")} className="mb-8 flex items-center gap-2 text-sm sm:gap-3">
      {steps.map((s, i) => {
        const state = states[s.key];
        const dot = (
          <span className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
            state === "done" && "bg-blue text-white",
            state === "current" && "bg-blue text-white ring-4 ring-blue-soft",
            state === "pending" && "border border-border text-muted-foreground",
          )}>
            {state === "done" ? <Check className="size-4" aria-hidden="true" /> : i + 1}
          </span>
        );
        const label = <span className={cn("hidden sm:inline", state === "pending" ? "text-muted-foreground" : "font-medium text-foreground")}>{s.label}</span>;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
            {state === "done" ? (
              <button type="button" onClick={() => onOpen(s.key)} className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {dot}{label}<span className="sr-only">{t("checkout.stepDone", { step: s.label })}</span>
              </button>
            ) : (
              <span className="flex items-center gap-2">{dot}{label}<span className="sr-only sm:hidden">{s.label}</span></span>
            )}
            {i < steps.length - 1 && <span aria-hidden="true" className={cn("h-px flex-1", state === "done" ? "bg-blue" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

function StepPanel({
  stepKey, index, title, state, open, openable, summary, onOpen, children,
}: {
  stepKey: StepKey; index: number; title: string; state: StepState; open: boolean; openable: boolean;
  summary?: ReactNode; onOpen: () => void; children: ReactNode;
}) {
  const headerId = `step-${stepKey}-header`;
  const panelId = `step-${stepKey}-panel`;
  return (
    <section className={cn("rounded-2xl border bg-card transition-shadow", open && "border-blue/40 shadow-sm")}>
      <h2 className="text-lg">
        <button
          id={headerId} type="button" aria-expanded={open} aria-controls={panelId}
          aria-disabled={!openable || undefined}
          onClick={() => { if (openable && !open) onOpen(); }}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            !openable && "cursor-not-allowed",
          )}
        >
          <span aria-hidden="true" className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
            state === "done" ? "bg-blue text-white" : state === "current" ? "bg-blue text-white" : "border border-border text-muted-foreground",
          )}>
            {state === "done" ? <Check className="size-4" aria-hidden="true" /> : index}
          </span>
          <span className={cn("font-display", state === "pending" && "text-muted-foreground")}>{title}</span>
          {!open && state === "done" && <span className="ml-auto text-sm font-medium text-blue">{t("checkout.change")}</span>}
        </button>
      </h2>
      {!open && state === "done" && summary && (
        <div className="-mt-2 px-5 pb-5 pl-15 text-sm text-muted-foreground">{summary}</div>
      )}
      <div id={panelId} role="region" aria-labelledby={headerId} hidden={!open} className="space-y-4 px-5 pb-5">
        {open && children}
      </div>
    </section>
  );
}

function RxGroup({
  title, name, emptyText, items, value, onPick,
}: {
  title: string; name: string; emptyText: string; items: Prescription[]; value: string | undefined; onPick: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm">
          {emptyText}{" "}
          {rich(t("checkout.rx.uploadPrompt"), { link: (c) => <Link href="/cuenta/recetas" className="font-medium text-blue underline">{c}</Link> })}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <ChoiceCard name={name} checked={value === r.id} onChange={() => onPick(r.id)}>
                <strong>{r.doctor_name}</strong> · {rxStatusLabel[r.status]}<br />
                <span className="optic">{t("rx.eyes", { od: r.od_sphere, os: r.os_sphere })}</span>
                <span className="text-muted-foreground"> · {t("rx.validUntil", { date: r.expires_at })}</span>
              </ChoiceCard>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function SummaryContent({ cart }: { cart: Cart }) {
  const hasFrames = cart.items.some((i) => i.category === "frame");
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {cart.items.map((i) => (
          <li key={i.id} className="flex gap-3 text-sm">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <LineImage src={imageSrc(i.product.image_url)} />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{t("format.quantity", { count: i.quantity })}{i.product.name}</span>
                <span className="shrink-0">{formatMxn(i.line_total_cents)}</span>
              </div>
              {i.category === "frame" && <FrameDetails item={i} />}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-4">
        <span>{t("cart.subtotal")}</span>
        <strong className="font-display text-2xl">{formatMxn(cart.subtotal_cents)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">{t("checkout.priceNote")}</p>
      {hasFrames && (
        <p className="text-xs text-muted-foreground">
          {cart.frame_lead_time_days != null && <>{t("checkout.leadTime", { time: formatLeadTime(cart.frame_lead_time_days) })} </>}
          {rich(t("checkout.customLenses"), { link: (c) => <Link href="/cambios-y-devoluciones" className="underline">{c}</Link> })}
        </p>
      )}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton className="mb-8 h-7 w-full max-w-md" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
        <Skeleton className="hidden h-72 w-full rounded-2xl lg:block" />
      </div>
    </div>
  );
}

export function CheckoutForm() {
  const queryClient = useQueryClient();
  const cartQuery = useGetCart();
  const addressesQuery = useListAddresses();
  const rxQuery = useListPrescriptions();
  const started = useRef(false);
  const [pickedRx, setPickedRx] = useState<string | null>(null);
  const [pickedGlassesRx, setPickedGlassesRx] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<StepKey | null>(null);

  const cartReady = cartQuery.data?.status === 200 && cartQuery.data.data.items.length > 0;
  useEffect(() => {
    if (cartReady && !started.current) {
      started.current = true;
      track("checkout_started");
    }
  }, [cartReady]);

  if (cartQuery.isLoading || addressesQuery.isLoading || rxQuery.isLoading) return <CheckoutSkeleton />;
  const cart = cartQuery.data?.status === 200 ? cartQuery.data.data : undefined;
  const addresses = addressesQuery.data?.status === 200 ? addressesQuery.data.data.items : [];
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-blue-soft text-blue"><ShoppingBag className="size-7" aria-hidden="true" /></span>
        <p className="text-lg">{t("checkout.emptyCart")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/armazones" className={buttonVariants({ size: "lg", className: "px-4" })}>{t("checkout.browseFrames")}</Link>
          <Link href="/lentes" className={buttonVariants({ size: "lg", variant: "outline", className: "px-4" })}>{t("checkout.browseLenses")}</Link>
        </div>
      </div>
    );
  }

  const needsRx = cart.items.some((i) => i.product.requires_prescription);
  const needsGlassesRx = cart.items.some((i) => i.lens_package?.requires_prescription);
  const usable = (rxQuery.data?.status === 200 ? rxQuery.data.data.items : []).filter(isUsable);
  // Una receta de armazones y una de lentes de contacto no son intercambiables.
  const prescriptions = usable.filter((r) => (r.kind ?? "contact_lens") === "contact_lens");
  const glassesPrescriptions = usable.filter((r) => r.kind === "glasses");
  const firstUsable = (list: typeof usable) => list.find((r) => r.status === "approved")?.id ?? list[0]?.id;
  // La de armazones más reciente, aunque siga en revisión: es la que se acaba de subir desde la ficha (SPEC 17).
  const newest = (list: typeof usable) => list.reduce<Prescription | undefined>((a, r) => (!a || r.created_at > a.created_at ? r : a), undefined)?.id;
  const prescriptionId = needsRx ? (pickedRx ?? firstUsable(prescriptions)) : undefined;
  const glassesPrescriptionId = needsGlassesRx ? (pickedGlassesRx ?? newest(glassesPrescriptions)) : undefined;
  const rxMissing = (needsRx && !prescriptionId) || (needsGlassesRx && !glassesPrescriptionId);
  const addressId = picked ?? addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id;
  const address = addresses.find((a) => a.id === addressId);

  const steps: { key: StepKey; label: string }[] = [
    { key: "address", label: t("checkout.steps.address") },
    ...(needsRx || needsGlassesRx ? [{ key: "prescription" as const, label: t("checkout.steps.prescription") }] : []),
    { key: "payment", label: t("checkout.steps.payment") },
  ];
  const complete: Record<StepKey, boolean> = { address: !!address, prescription: !rxMissing, payment: false };
  const openable = (k: StepKey) => steps.slice(0, steps.findIndex((s) => s.key === k)).every((s) => complete[s.key]);
  // Se abre el primer paso incompleto hasta que el cliente elija otro.
  const current: StepKey = openStep && openable(openStep) ? openStep : (steps.find((s) => !complete[s.key])?.key ?? "payment");
  const states = Object.fromEntries(steps.map((s) => [
    s.key, s.key === current ? "current" : complete[s.key] ? "done" : "pending",
  ])) as Record<StepKey, StepState>;
  // El foco sigue al paso que se abre con "Continuar" o "Cambiar", una vez pintado.
  const go = (k: StepKey) => {
    setOpenStep(k);
    requestAnimationFrame(() => document.getElementById(`step-${k}-header`)?.focus());
  };
  const next = (k: StepKey) => {
    const following = steps[steps.findIndex((s) => s.key === k) + 1];
    if (following) go(following.key);
  };
  const pickedRxs = [
    needsRx ? prescriptions.find((r) => r.id === prescriptionId) : undefined,
    needsGlassesRx ? glassesPrescriptions.find((r) => r.id === glassesPrescriptionId) : undefined,
  ].filter((r): r is Prescription => !!r);

  async function pay() {
    if (!addressId || rxMissing || paying) return;
    setPaying(true);
    setError(null);
    const res = await createCheckout({ address_id: addressId, prescription_id: prescriptionId ?? null, glasses_prescription_id: glassesPrescriptionId ?? null });
    if (res.status !== 201) {
      setPaying(false);
      setError(checkoutMessage(res.status, (res.data as { detail?: string } | undefined)?.detail));
      return queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    }
    // El pago ocurre en Mercado Pago; regresamos a /checkout/resultado.
    window.location.assign(res.data.init_point);
  }

  const panel = (k: StepKey) => ({
    stepKey: k,
    index: steps.findIndex((s) => s.key === k) + 1,
    title: k === "address" ? t("checkout.address.title") : k === "prescription" ? t("checkout.rx.title") : t("checkout.payment.title"),
    state: states[k],
    open: current === k,
    openable: openable(k),
    onOpen: () => go(k),
  });

  return (
    <div className="ph-no-capture">
      <Stepper steps={steps} states={states} onOpen={go} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <details className="group rounded-2xl border bg-card lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-medium">
              {t("checkout.summaryToggle")}
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </span>
            <strong className="font-display text-lg">{formatMxn(cart.subtotal_cents)}</strong>
          </summary>
          <div className="border-t p-4"><SummaryContent cart={cart} /></div>
        </details>

        <div className="space-y-3">
          <StepPanel {...panel("address")} summary={address && <><strong className="text-foreground">{address.recipient}</strong> · {addressLine(address)}</>}>
            {addresses.length > 0 && !adding ? (
              <>
                <fieldset>
                  <legend className="sr-only">{t("checkout.address.title")}</legend>
                  <ul className="space-y-2">
                    {addresses.map((a) => (
                      <li key={a.id}>
                        <ChoiceCard name="address" checked={addressId === a.id} onChange={() => setPicked(a.id)}>
                          <strong>{a.recipient}</strong><br />
                          {a.street} {a.ext_number}{a.int_number ? t("checkout.address.interior", { number: a.int_number }) : ""}, {a.neighborhood}<br />
                          <span className="text-muted-foreground">{a.city}, {a.state} {a.postal_code} · {a.phone}</span>
                        </ChoiceCard>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button variant="ghost" size="lg" className="text-blue" onClick={() => setAdding(true)}>{t("checkout.address.addAnother")}</Button>
                  <Button size="lg" className="px-6" disabled={!address} onClick={() => next("address")}>{t("checkout.continue")}</Button>
                </div>
              </>
            ) : (
              <AddressForm
                idPrefix="checkout-address"
                onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
                onSaved={(a) => { setPicked(a.id); setAdding(false); next("address"); }}
              />
            )}
          </StepPanel>

          {(needsRx || needsGlassesRx) && (
            <StepPanel {...panel("prescription")} summary={pickedRxs.map(rxLine).join(" / ")}>
              {needsRx && (
                <RxGroup
                  title={needsGlassesRx ? t("checkout.rx.lensesTitle") : t("checkout.rx.title")} name="rx"
                  emptyText={t("checkout.rx.lensesEmpty")}
                  items={prescriptions} value={prescriptionId} onPick={setPickedRx}
                />
              )}
              {needsGlassesRx && (
                <RxGroup
                  title={needsRx ? t("checkout.rx.framesTitle") : t("checkout.rx.title")} name="glasses-rx"
                  emptyText={t("checkout.rx.framesEmpty")}
                  items={glassesPrescriptions} value={glassesPrescriptionId} onPick={setPickedGlassesRx}
                />
              )}
              <div className="flex justify-end">
                <Button size="lg" className="px-6" disabled={rxMissing} onClick={() => next("prescription")}>{t("checkout.continue")}</Button>
              </div>
            </StepPanel>
          )}

          <StepPanel {...panel("payment")}>
            <dl className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
              {address && (
                <div>
                  <dt className="text-muted-foreground">{t("checkout.payment.shipTo")}</dt>
                  <dd><strong>{address.recipient}</strong> · {addressLine(address)}</dd>
                </div>
              )}
              {pickedRxs.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">{t("checkout.payment.prescription")}</dt>
                  <dd>{pickedRxs.map(rxLine).join(" / ")}</dd>
                </div>
              )}
            </dl>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("checkout.payment.note")}
            </p>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button size="lg" className="h-12 w-full text-base" aria-busy={paying || undefined}
              disabled={!addressId || rxMissing || paying} onClick={pay}>
              {paying ? t("checkout.redirecting") : t("checkout.pay")}
            </Button>
          </StepPanel>
        </div>

        <aside aria-label={t("checkout.summary")} className="hidden h-fit rounded-2xl border bg-card p-6 lg:sticky lg:top-36 lg:block">
          <h2 className="mb-4 text-lg">{t("checkout.summary")}</h2>
          <SummaryContent cart={cart} />
        </aside>
      </div>
    </div>
  );
}
