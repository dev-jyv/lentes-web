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
import { getGetCartQueryKey, useGetCart } from "@/lib/api/generated/cart/cart";
import { createCheckout } from "@/lib/api/generated/checkout/checkout";
import {
  createAddress, getListAddressesQueryKey, useListAddresses, useListPrescriptions,
} from "@/lib/api/generated/me/me";
import { useTurnstile } from "@/components/turnstile";
import { track } from "@/lib/analytics";
import { formatMxn } from "@/lib/format";
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

export function CheckoutForm() {
  const queryClient = useQueryClient();
  const cartQuery = useGetCart();
  const addressesQuery = useListAddresses();
  const rxQuery = useListPrescriptions();
  const turnstile = useTurnstile();
  const started = useRef(false);
  const [pickedRx, setPickedRx] = useState<string | null>(null);
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
      Tu carrito está vacío. <Link href="/lentes" className="underline">Ver catálogo</Link>
    </p>;
  }
  const needsRx = cart.items.some((i) => i.requires_prescription);
  const prescriptions = (rxQuery.data?.status === 200 ? rxQuery.data.data.items : []).filter(isUsable);
  const prescriptionId = needsRx
    ? (pickedRx ?? prescriptions.find((r) => r.status === "approved")?.id ?? prescriptions[0]?.id)
    : undefined;
  const addressId = picked ?? addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id;

  async function pay() {
    if (!addressId || (needsRx && !prescriptionId) || (turnstile.required && !turnstile.token)) return;
    setPaying(true);
    setError(null);
    const res = await createCheckout({ address_id: addressId, prescription_id: prescriptionId ?? null, turnstile_token: turnstile.token });
    if (res.status !== 200) {
      setPaying(false);
      turnstile.reset();
      setError(
        res.status === 409
          ? "Algunos artículos ya no están disponibles o cambió el precio. Revisa tu carrito."
          : "No pudimos iniciar el pago. Intenta de nuevo.",
      );
      return queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    }
    // El pago ocurre en Mercado Pago; regresamos a /checkout/resultado.
    window.location.assign(res.data.init_point);
  }

  return (
    <div className="ph-no-capture grid gap-8 md:grid-cols-[1fr_280px]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Dirección de envío</h2>
        {addresses.length > 0 && !adding && (
          <ul className="space-y-2">
            {addresses.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
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
          <>
            <h2 className="pt-4 text-lg font-semibold">Receta</h2>
            {prescriptions.length === 0 ? (
              <p className="text-sm">
                Tus lentes requieren receta vigente.{" "}
                <Link href="/cuenta/recetas" className="underline">Sube tu receta</Link> y regresa aquí.
              </p>
            ) : (
              <ul className="space-y-2">
                {prescriptions.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                      <input type="radio" name="rx" className="mt-1"
                        checked={prescriptionId === r.id} onChange={() => setPickedRx(r.id)} />
                      <span>
                        <strong>{r.doctor_name}</strong> · {rxStatusLabel[r.status]}<br />
                        OD {r.od_sphere} · OI {r.os_sphere} · vigente hasta {r.expires_at}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      <aside className="h-fit space-y-4 rounded-lg border p-4">
        <h2 className="font-semibold">Resumen</h2>
        <ul className="space-y-1 text-sm">
          {cart.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>{i.quantity}× {i.product_name}</span>
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
        {turnstile.widget}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button size="lg" className="w-full" disabled={!addressId || (needsRx && !prescriptionId) || (turnstile.required && !turnstile.token) || paying} onClick={pay}>
          {paying ? "Redirigiendo…" : "Pagar con Mercado Pago"}
        </Button>
      </aside>
    </div>
  );
}
