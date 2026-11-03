"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createAddress, createCheckout, getGetCartQueryKey, getListAddressesQueryKey, useGetCart, useListAddresses,
  useListPrescriptions,
} from "@/lib/api/generated/api";
import { useTurnstile } from "@/components/turnstile";
import { track } from "@/lib/analytics";
import { formatLeadTime, formatMxn } from "@/lib/format";
import type { Prescription } from "@/lib/api/generated/model";
import { isUsable, rxStatusLabel } from "@/lib/prescription";

const req = z.string().trim().min(1, "Requerido");
const schema = z.object({
  recipient: req, street: req, ext_number: req, int_number: z.string(),
  neighborhood: req, city: req, state: req,
  postal_code: z.string().regex(/^\d{5}$/, "5 dígitos"),
  phone: z.string().regex(/^\d{10}$/, "10 dígitos"),
});
type AddressValues = z.infer<typeof schema>;

const fields: { name: keyof AddressValues; label: string; wide?: boolean }[] = [
  { name: "recipient", label: "Nombre de quien recibe", wide: true },
  { name: "street", label: "Calle", wide: true },
  { name: "ext_number", label: "No. exterior" },
  { name: "int_number", label: "No. interior (opcional)" },
  { name: "neighborhood", label: "Colonia", wide: true },
  { name: "city", label: "Ciudad" },
  { name: "state", label: "Estado" },
  { name: "postal_code", label: "Código postal" },
  { name: "phone", label: "Teléfono (10 dígitos)" },
];

function AddressForm({ onSaved }: { onSaved: (id: string) => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<AddressValues>({ resolver: zodResolver(schema) });
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(async (v) => {
      setError(null);
      const res = await createAddress({
        ...v, int_number: v.int_number || null, is_default: true,
      });
      if (res.status !== 201) return setError("No pudimos guardar la dirección.");
      await queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
      onSaved(res.data.id);
    })}>
      {fields.map((f) => (
        <div key={f.name} className={f.wide ? "space-y-1 sm:col-span-2" : "space-y-1"}>
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} aria-invalid={!!errors[f.name]} {...register(f.name)} />
          {errors[f.name] && <p className="text-xs text-destructive">{errors[f.name]?.message}</p>}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">Guardar dirección</Button>
    </form>
  );
}

// La API manda `detail` en español y apto para el cliente en 409 (existencias, receta, carrito vacío).
function checkoutMessage(status: number, detail?: string) {
  switch (status) {
    case 409:
      return detail ?? "Algunos artículos ya no están disponibles. Revisa tu carrito.";
    case 403:
      return "No pudimos verificar que eres una persona. Intenta de nuevo.";
    case 404:
      return "No encontramos la dirección o la receta. Revísalas e intenta de nuevo.";
    case 503:
      return "Los pagos no están disponibles por ahora. Intenta más tarde.";
    default:
      return "No pudimos iniciar el pago. Intenta de nuevo.";
  }
}

function RxPicker({
  title, name, emptyText, items, value, onPick,
}: {
  title: string; name: string; emptyText: string; items: Prescription[]; value: string | undefined; onPick: (id: string) => void;
}) {
  return (
    <>
      <h2 className="pt-4 text-lg">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm">
          {emptyText}{" "}
          <Link href="/cuenta/recetas" className="underline">Sube tu receta</Link> y regresa aquí.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary">
                <input type="radio" name={name} className="mt-1" checked={value === r.id} onChange={() => onPick(r.id)} />
                <span>
                  <strong>{r.doctor_name}</strong> · {rxStatusLabel[r.status]}<br />
                  <span className="optic">OD {r.od_sphere} · OI {r.os_sphere}</span> · vigente hasta {r.expires_at}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function CheckoutForm() {
  const queryClient = useQueryClient();
  const cartQuery = useGetCart();
  const addressesQuery = useListAddresses();
  const rxQuery = useListPrescriptions();
  const turnstile = useTurnstile();
  const started = useRef(false);
  const [pickedRx, setPickedRx] = useState<string | null>(null);
  const [pickedGlassesRx, setPickedGlassesRx] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartReady = cartQuery.data?.status === 200 && cartQuery.data.data.items.length > 0;
  useEffect(() => {
    if (cartReady && !started.current) {
      started.current = true;
      track("checkout_started");
    }
  }, [cartReady]);

  if (cartQuery.isLoading || addressesQuery.isLoading || rxQuery.isLoading) return <Skeleton className="h-60 w-full" />;
  const cart = cartQuery.data?.status === 200 ? cartQuery.data.data : undefined;
  const addresses = addressesQuery.data?.status === 200 ? addressesQuery.data.data.items : [];
  if (!cart || cart.items.length === 0) {
    return <p className="py-10 text-center text-muted-foreground">
      Tu carrito está vacío. <Link href="/armazones" className="underline">Ver armazones</Link> o <Link href="/lentes" className="underline">lentes de contacto</Link>
    </p>;
  }
  const needsRx = cart.items.some((i) => i.product.requires_prescription);
  const needsGlassesRx = cart.items.some((i) => i.lens_package?.requires_prescription);
  const hasFrames = cart.items.some((i) => i.category === "frame");
  const usable = (rxQuery.data?.status === 200 ? rxQuery.data.data.items : []).filter(isUsable);
  // Una receta de armazones y una de lentes de contacto no son intercambiables.
  const prescriptions = usable.filter((r) => (r.kind ?? "contact_lens") === "contact_lens");
  const glassesPrescriptions = usable.filter((r) => r.kind === "glasses");
  const firstUsable = (list: typeof usable) => list.find((r) => r.status === "approved")?.id ?? list[0]?.id;
  const prescriptionId = needsRx ? (pickedRx ?? firstUsable(prescriptions)) : undefined;
  const glassesPrescriptionId = needsGlassesRx ? (pickedGlassesRx ?? firstUsable(glassesPrescriptions)) : undefined;
  const rxMissing = (needsRx && !prescriptionId) || (needsGlassesRx && !glassesPrescriptionId);
  const addressId = picked ?? addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id;

  async function pay() {
    if (!addressId || rxMissing || (turnstile.required && !turnstile.token)) return;
    setPaying(true);
    setError(null);
    const res = await createCheckout({ address_id: addressId, prescription_id: prescriptionId ?? null, glasses_prescription_id: glassesPrescriptionId ?? null, turnstile_token: turnstile.token });
    if (res.status !== 201) {
      setPaying(false);
      turnstile.reset();
      setError(checkoutMessage(res.status, (res.data as { detail?: string } | undefined)?.detail));
      return queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    }
    // El pago ocurre en Mercado Pago; regresamos a /checkout/resultado.
    window.location.assign(res.data.init_point);
  }

  return (
    <div className="ph-no-capture grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <h2 className="text-lg">Dirección de envío</h2>
        {addresses.length > 0 && !adding && (
          <ul className="space-y-2">
            {addresses.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary">
                  <input type="radio" name="address" className="mt-1"
                    checked={addressId === a.id} onChange={() => setPicked(a.id)} />
                  <span>
                    <strong>{a.recipient}</strong><br />
                    {a.street} {a.ext_number}{a.int_number ? ` int. ${a.int_number}` : ""}, {a.neighborhood}<br />
                    {a.city}, {a.state} {a.postal_code} · {a.phone}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {(adding || addresses.length === 0) ? (
          <AddressForm onSaved={(id) => { setPicked(id); setAdding(false); }} />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>Agregar otra dirección</Button>
        )}
        {needsRx && (
          <RxPicker
            title={needsGlassesRx ? "Receta de lentes de contacto" : "Receta"} name="rx"
            emptyText="Tus lentes requieren receta vigente de lentes de contacto."
            items={prescriptions} value={prescriptionId} onPick={setPickedRx}
          />
        )}
        {needsGlassesRx && (
          <RxPicker
            title={needsRx ? "Receta de armazones" : "Receta"} name="glasses-rx"
            emptyText="Tus micas requieren receta vigente de armazones."
            items={glassesPrescriptions} value={glassesPrescriptionId} onPick={setPickedGlassesRx}
          />
        )}
      </section>
      <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-28">
        <h2 className="text-lg">Resumen</h2>
        <ul className="space-y-1 text-sm">
          {cart.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>{i.quantity}× {i.product.name}</span>
              <span>{formatMxn(i.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t pt-3">
          <span>Subtotal</span><strong>{formatMxn(cart.subtotal_cents)}</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          El backend valida precios y stock al pagar; el total final puede variar por envío.
        </p>
        {hasFrames && (
          <p className="text-xs text-muted-foreground">
            {cart.frame_lead_time_days != null && <>Tus armazones con micas se entregan en {formatLeadTime(cart.frame_lead_time_days)}. </>}
            Las micas se fabrican a medida: consulta la{" "}
            <Link href="/cambios-y-devoluciones" className="underline">política de cambios y devoluciones</Link>.
          </p>
        )}
        {turnstile.widget}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button size="lg" className="w-full" disabled={!addressId || rxMissing || (turnstile.required && !turnstile.token) || paying} onClick={pay}>
          {paying ? "Redirigiendo…" : "Pagar con Mercado Pago"}
        </Button>
      </aside>
    </div>
  );
}
