"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileCheck2, Lock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AddressForm } from "@/components/cuenta/address-form";
import {
  addressLine, CheckoutSkeleton, EmptyCheckout, StepPanel, Stepper, SummaryContent, type StepKey, type StepState,
} from "@/components/tienda/checkout-form";
import { useTurnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createGuestCheckout, createGuestPrescriptionUploadUrl, getGetCartQueryKey, useGetCart,
} from "@/lib/api/generated/api";
import type { GuestContact } from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { formatMxn } from "@/lib/format";
import { readGuestDraft, writeGuestDraft, type GuestDraft } from "@/lib/guest-checkout";
import { LEGAL_REVIEWED } from "@/lib/legal";
import { ALLOWED_TYPES, MAX_FILE_BYTES, type AllowedType } from "@/lib/prescription";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

type Contact = Required<GuestContact>;
type Problem = { detail?: string; type?: string };

const contactSchema = z.object({
  email: z.string().trim().email(t("validation.invalidEmail")),
  first_name: z.string().trim().min(1, t("validation.required")).max(80, t("validation.max80")),
  last_name: z.string().trim().min(1, t("validation.required")).max(80, t("validation.max80")),
  phone: z.string().transform((v) => v.replace(/[\s-]/g, "")).pipe(z.string().regex(/^\d{10}$/, t("validation.tenDigits"))),
  marketing_opt_in: z.boolean(),
});

// Paso Identificación: lo esencial para la compra y para escribirle sobre su pedido.
function ContactForm({ initial, onDone, onLogin }: { initial?: Contact; onDone: (c: Contact) => void; onLogin: () => void }) {
  const id = useId();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: initial ?? { email: "", first_name: "", last_name: "", phone: "", marketing_opt_in: false },
  });
  const field = (name: "email" | "first_name" | "last_name" | "phone", label: string, extra: React.ComponentProps<"input">, wide = false) => {
    const err = errors[name]?.message;
    return (
      <div className={wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
        <Label htmlFor={`${id}${name}`}>{label}</Label>
        <Input id={`${id}${name}`} aria-invalid={!!err} aria-describedby={err ? `${id}${name}-error` : undefined} {...extra} {...register(name)} />
        {err && <p id={`${id}${name}-error`} className="text-xs text-destructive">{err}</p>}
      </div>
    );
  };
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => onDone(v))}>
      <p className="text-sm text-muted-foreground sm:col-span-2">{t("checkout.guest.contactIntro")}</p>
      {field("email", t("checkout.guest.email"), { type: "email", autoComplete: "email" }, true)}
      <p className="-mt-2 text-sm text-muted-foreground sm:col-span-2">
        {rich(t("checkout.guest.haveAccount"), { link: (c) => (
          <button type="button" onClick={onLogin} className="font-medium text-blue underline-offset-4 hover:underline">{c}</button>
        ) })}
      </p>
      {field("first_name", t("checkout.guest.firstName"), { autoComplete: "given-name" })}
      {field("last_name", t("checkout.guest.lastName"), { autoComplete: "family-name" })}
      {field("phone", t("checkout.guest.phone"), { type: "tel", inputMode: "numeric", autoComplete: "tel-national" })}
      {LEGAL_REVIEWED && (
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--blue)]" {...register("marketing_opt_in")} />
          {t("checkout.guest.marketing")}
        </label>
      )}
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" size="lg" className="px-6">{t("checkout.guest.toShipping")}</Button>
      </div>
    </form>
  );
}

// Sube la foto o PDF de la receta a R2 bajo el carrito del invitado; solo queda la llave en memoria.
function RxUpload({ label, file, onUploaded }: { label: string; file?: string; onUploaded: (key: string, name: string) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type as AllowedType)) return setError(t("rx.form.badFileType"));
    if (f.size > MAX_FILE_BYTES) return setError(t("rx.form.fileTooLarge"));
    setBusy(true);
    const up = await createGuestPrescriptionUploadUrl({ content_type: f.type as AllowedType, size_bytes: f.size }).catch(() => null);
    if (up?.status !== 200) {
      setBusy(false);
      return setError((up?.data as Problem | undefined)?.detail ?? t("rx.form.prepareFailed"));
    }
    const put = await fetch(up.data.upload_url, { method: "PUT", body: f, headers: { "Content-Type": f.type } }).catch(() => null);
    setBusy(false);
    if (!put?.ok) return setError(t("rx.form.uploadFailed"));
    onUploaded(up.data.r2_key, f.name);
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {file && (
        <p className="flex items-center gap-2 rounded-xl bg-blue-soft p-3 text-sm">
          <FileCheck2 className="size-4 shrink-0 text-blue" aria-hidden="true" />
          <span className="min-w-0 truncate">{t("checkout.guest.rxReady", { name: file })}</span>
        </p>
      )}
      <Input id={id} type="file" accept={ALLOWED_TYPES.join(",")} disabled={busy} aria-describedby={`${id}-help`}
        onChange={(e) => void upload(e.target.files?.[0])} />
      <p id={`${id}-help`} aria-live="polite" className="text-xs text-muted-foreground">
        {busy ? t("checkout.guest.uploading") : t("checkout.guest.rxHelp")}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Checkout sin cuenta (SPEC 25): Identificación → Envío → Receta (si aplica) → Pago, en el mismo acordeón de SPEC 19.
export function GuestCheckout({ onLogin }: { onLogin: () => void }) {
  const queryClient = useQueryClient();
  const cartQuery = useGetCart();
  const turnstile = useTurnstile();
  const started = useRef(false);
  // El borrador de la pestaña se lee una vez: este componente solo se monta en el navegador.
  const [draft, setDraft] = useState<GuestDraft>(() => readGuestDraft());
  const [rx, setRx] = useState<{ lens?: { key: string; name: string }; glasses?: { key: string; name: string } }>({});
  const [openStep, setOpenStep] = useState<StepKey | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<{ step: StepKey; text: string } | null>(null);

  const cart = cartQuery.data?.status === 200 ? cartQuery.data.data : undefined;
  const cartReady = !!cart && cart.items.length > 0;
  useEffect(() => {
    if (cartReady && !started.current) {
      started.current = true;
      track("checkout_started", { guest: true });
    }
  }, [cartReady]);

  if (cartQuery.isLoading) return <CheckoutSkeleton />;
  // El carrito vacío se muestra igual que con sesión.
  if (!cart || cart.items.length === 0) return <EmptyCheckout />;

  const needsRx = cart.items.some((i) => i.product.requires_prescription);
  const needsGlassesRx = cart.items.some((i) => i.lens_package?.requires_prescription);
  const contact = draft.contact;
  const address = draft.address;
  const steps: { key: StepKey; label: string }[] = [
    { key: "contact", label: t("checkout.steps.contact") },
    { key: "address", label: t("checkout.steps.shipping") },
    ...(needsRx || needsGlassesRx ? [{ key: "prescription" as const, label: t("checkout.steps.prescription") }] : []),
    { key: "payment", label: t("checkout.steps.payment") },
  ];
  const rxDone = (!needsRx || !!rx.lens) && (!needsGlassesRx || !!rx.glasses);
  const complete: Record<StepKey, boolean> = { contact: !!contact, address: !!address, prescription: rxDone, payment: false };
  const openable = (k: StepKey) => steps.slice(0, steps.findIndex((s) => s.key === k)).every((s) => complete[s.key]);
  const current: StepKey = openStep && openable(openStep) ? openStep : (steps.find((s) => !complete[s.key])?.key ?? "payment");
  const states = Object.fromEntries(steps.map((s) => [
    s.key, s.key === current ? "current" : complete[s.key] ? "done" : "pending",
  ])) as Record<StepKey, StepState>;
  const go = (k: StepKey) => {
    setOpenStep(k);
    requestAnimationFrame(() => document.getElementById(`step-${k}-header`)?.focus());
  };
  const next = (k: StepKey) => {
    const following = steps[steps.findIndex((s) => s.key === k) + 1];
    if (following) go(following.key);
  };
  const save = (patch: GuestDraft) => {
    writeGuestDraft(patch);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const panel = (k: StepKey, title: string) => ({
    stepKey: k, index: steps.findIndex((s) => s.key === k) + 1, title, state: states[k],
    open: current === k, openable: openable(k), onOpen: () => go(k),
  });
  const stepError = (k: StepKey) => error?.step === k && (
    <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error.text}</p>
  );

  async function pay() {
    if (!contact || !address || !rxDone || paying) return;
    if (turnstile.required && !turnstile.token) return setError({ step: "payment", text: t("checkout.errors.captcha") });
    setPaying(true);
    setError(null);
    const res = await createGuestCheckout({
      contact, address,
      prescription_upload: needsRx && rx.lens ? { r2_key: rx.lens.key } : null,
      glasses_prescription_upload: needsGlassesRx && rx.glasses ? { r2_key: rx.glasses.key } : null,
      captcha_token: turnstile.token ?? "",
    }).catch(() => null);
    turnstile.reset();
    if (res?.status === 201) {
      writeGuestDraft({ order: { id: res.data.order_id, token: res.data.order_token } });
      // El pago ocurre en Mercado Pago; regresa a /pedido/[id] con el enlace privado.
      return window.location.assign(res.data.init_point);
    }
    setPaying(false);
    const problem = (res?.data as Problem | undefined) ?? {};
    // Con sesión abierta en otra pestaña, la página cambia al checkout de la cuenta.
    if (problem.type === "use-account-checkout") return window.location.reload();
    const text = Number(res?.status) === 503 ? t("checkout.errors.paymentsDown") : (problem.detail ?? t("checkout.errors.generic"));
    // La receta se corrige en su paso; existencias, CAPTCHA y límite de intentos, en Pago.
    if (res?.status === 409 && /receta/i.test(text) && steps.some((s) => s.key === "prescription")) {
      setRx({});
      setError({ step: "prescription", text });
      return go("prescription");
    }
    setError({ step: "payment", text });
    await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
  }

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
          <StepPanel {...panel("contact", t("checkout.guest.contactTitle"))} summary={contact && (
            <>{contact.email}<br />{contact.first_name} {contact.last_name} · {contact.phone}</>
          )}>
            <ContactForm initial={contact} onLogin={onLogin} onDone={(c) => { save({ contact: c }); next("contact"); }} />
          </StepPanel>

          <StepPanel {...panel("address", t("checkout.address.title"))} summary={address && (
            <><strong className="text-foreground">{address.recipient}</strong> · {addressLine(address)}<br />{address.references}</>
          )}>
            <AddressForm
              idPrefix="guest-address"
              submitLabel={t("checkout.guest.toNext")}
              initial={address ?? (contact && { recipient: `${contact.first_name} ${contact.last_name}`, phone: contact.phone })}
              onSubmit={({ is_default: _default, ...rest }) => {
                void _default;
                save({ address: rest });
                next("address");
              }}
            />
          </StepPanel>

          {(needsRx || needsGlassesRx) && (
            <StepPanel {...panel("prescription", t("checkout.rx.title"))} summary={[rx.lens?.name, rx.glasses?.name].filter(Boolean).join(" / ")}>
              <p className="text-sm text-muted-foreground">{t("checkout.guest.rxIntro")}</p>
              {stepError("prescription")}
              {needsRx && (
                <RxUpload label={needsGlassesRx ? t("checkout.rx.lensesTitle") : t("checkout.guest.rxFile")} file={rx.lens?.name}
                  onUploaded={(key, name) => setRx((r) => ({ ...r, lens: { key, name } }))} />
              )}
              {needsGlassesRx && (
                <RxUpload label={needsRx ? t("checkout.rx.framesTitle") : t("checkout.guest.rxFile")} file={rx.glasses?.name}
                  onUploaded={(key, name) => setRx((r) => ({ ...r, glasses: { key, name } }))} />
              )}
              <div className="flex justify-end">
                <Button size="lg" className="px-6" disabled={!rxDone} onClick={() => { setError(null); next("prescription"); }}>{t("checkout.continue")}</Button>
              </div>
            </StepPanel>
          )}

          <StepPanel {...panel("payment", t("checkout.payment.title"))}>
            <dl className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
              {contact && (
                <div>
                  <dt className="text-muted-foreground">{t("checkout.guest.contactTitle")}</dt>
                  <dd>{contact.email} · {contact.phone}</dd>
                </div>
              )}
              {address && (
                <div>
                  <dt className="text-muted-foreground">{t("checkout.payment.shipTo")}</dt>
                  <dd><strong>{address.recipient}</strong> · {addressLine(address)}</dd>
                </div>
              )}
            </dl>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("checkout.payment.note")}
            </p>
            {turnstile.widget}
            {stepError("payment")}
            <Button size="lg" className="h-12 w-full text-base" aria-busy={paying || undefined}
              disabled={!contact || !address || !rxDone || paying} onClick={pay}>
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
