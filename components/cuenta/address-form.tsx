"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAddress, getListAddressesQueryKey, updateAddress, useGetPostalCode } from "@/lib/api/generated/api";
import type { Address, AddressInput } from "@/lib/api/generated/model";
import { t } from "@/lib/i18n";

const req = z.string().trim().min(1, t("validation.required"));
const schema = z.object({
  recipient: req, street: req, ext_number: req, int_number: z.string(),
  neighborhood: req, city: req, state: req,
  postal_code: z.string().regex(/^\d{5}$/, t("validation.fiveDigits")),
  phone: z.string().regex(/^\d{10}$/, t("validation.tenDigits")),
  // Obligatorias en la tienda (SPEC 25); en la API son opcionales para no romper direcciones anteriores.
  references: req.max(200, t("validation.max200")),
  is_default: z.boolean(),
});
type AddressValues = z.infer<typeof schema>;
type FieldName = Exclude<keyof AddressValues, "is_default">;

type Field = { name: FieldName; label: string; autoComplete: string; inputMode?: "numeric" | "tel"; wide?: boolean };
const labels: Record<FieldName, string> = {
  recipient: t("checkout.address.recipient"), street: t("checkout.address.street"),
  ext_number: t("checkout.address.extNumber"), int_number: t("checkout.address.intNumber"),
  neighborhood: t("checkout.address.neighborhood"), city: t("checkout.address.city"), state: t("checkout.address.state"),
  postal_code: t("checkout.address.postalCode"), phone: t("checkout.address.phone"),
  references: t("checkout.address.references"),
};
const f = (name: FieldName, autoComplete: string, extra: Partial<Field> = {}): Field =>
  ({ name, autoComplete, label: labels[name], ...extra });

const OTHER = "__other__";
// Consulta oficial de Correos de México para quien no conoce su código postal.
const POSTAL_LOOKUP_URL = "https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/Descarga.aspx";
const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

// Formulario de dirección compartido por el checkout (SPEC 19) y la libreta de direcciones (SPEC 21).
// El código postal va primero y completa estado, municipio y colonias con el catálogo de Correos de México (SPEC 23).
// Con `onSubmit` no guarda en la cuenta: el checkout de invitado (SPEC 25) conserva la dirección en su estado.
export function AddressForm({
  address, initial, onSaved, onSubmit, onCancel, showDefault = false, idPrefix = "address", submitLabel,
}: {
  address?: Address;
  initial?: Partial<AddressInput>;
  onSaved?: (address: Address) => void;
  onSubmit?: (address: AddressInput) => void;
  onCancel?: () => void;
  showDefault?: boolean;
  idPrefix?: string;
  submitLabel?: string;
}) {
  const start = address ?? initial;
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, getValues, control, formState: { errors, isSubmitting } } = useForm<AddressValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipient: start?.recipient ?? "", street: start?.street ?? "", ext_number: start?.ext_number ?? "",
      int_number: start?.int_number ?? "", neighborhood: start?.neighborhood ?? "", city: start?.city ?? "",
      state: start?.state ?? "", postal_code: start?.postal_code ?? "", phone: start?.phone ?? "",
      references: start?.references ?? "", is_default: address?.is_default ?? !showDefault,
    },
    shouldFocusError: true,
  });
  const [error, setError] = useState<string | null>(null);
  // "Cambiar" en estado y municipio, y "Otra colonia": el cliente escribe a mano.
  const [editPlace, setEditPlace] = useState(false);
  const [otherNeighborhood, setOtherNeighborhood] = useState(false);

  const cp = useWatch({ control, name: "postal_code" });
  const neighborhood = useWatch({ control, name: "neighborhood" });
  // Una dirección guardada conserva sus valores hasta que el cliente cambie el código postal.
  const lookup = /^\d{5}$/.test(cp ?? "") && cp !== start?.postal_code;
  const query = useGetPostalCode(cp, { query: { enabled: lookup, staleTime: 86_400_000, retry: false } });
  const place = lookup && query.data?.status === 200 ? query.data.data : null;
  const notFound = lookup && !query.isFetching && (query.isError || (query.data && query.data.status !== 200));

  useEffect(() => {
    if (!place) return;
    setValue("state", place.state, { shouldValidate: true });
    setValue("city", place.city ?? place.municipality, { shouldValidate: true });
    // Una sola colonia queda elegida; una colonia escrita que no está en la lista se limpia.
    const names = place.neighborhoods.map((n) => n.name);
    if (names.length === 1) setValue("neighborhood", names[0], { shouldValidate: true });
    else if (!names.includes(getValues("neighborhood"))) setValue("neighborhood", "");
  }, [place, setValue, getValues]);

  const placeAsText = place && !editPlace;
  const neighborhoodSelect = place && !otherNeighborhood;
  const id = (name: string) => `${idPrefix}-${name}`;

  const input = (field: Field) => {
    const err = errors[field.name]?.message;
    return (
      <div key={field.name} className={field.wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
        <Label htmlFor={id(field.name)}>{field.label}</Label>
        <Input id={id(field.name)} autoComplete={field.autoComplete} inputMode={field.inputMode} aria-invalid={!!err}
          aria-describedby={err ? `${id(field.name)}-error` : undefined} {...register(field.name)} />
        {err && <p id={`${id(field.name)}-error`} className="text-xs text-destructive">{err}</p>}
      </div>
    );
  };

  const cpReg = register("postal_code", {
    // Código nuevo: se vuelve a consultar y se regresa a estado y colonia del catálogo.
    onChange: () => {
      setEditPlace(false);
      setOtherNeighborhood(false);
    },
  });
  const cpErr = errors.postal_code?.message;
  const nbErr = errors.neighborhood?.message;

  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(async (v) => {
      setError(null);
      const body = { ...v, int_number: v.int_number.trim() || null, references: v.references.trim() };
      if (onSubmit) return onSubmit(body);
      const res = address ? await updateAddress(address.id, body) : await createAddress(body);
      if (res.status !== 200 && res.status !== 201) {
        return setError((res.data as { detail?: string } | undefined)?.detail ?? t("checkout.address.saveFailed"));
      }
      await queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
      onSaved?.(res.data as Address);
    })}>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id("postal_code")}>{t("checkout.address.postalCode")}</Label>
        <Input id={id("postal_code")} autoComplete="postal-code" inputMode="numeric" maxLength={5} className="sm:max-w-48"
          aria-invalid={!!cpErr} aria-describedby={`${id("postal_code")}-status`} {...cpReg} />
        <div id={`${id("postal_code")}-status`} aria-live="polite" className="space-y-1 text-xs">
          {cpErr && <p className="text-destructive">{cpErr}</p>}
          {lookup && query.isFetching && <p className="text-muted-foreground">{t("checkout.address.lookingUp")}</p>}
          {notFound && <p className="text-muted-foreground">{t("checkout.address.postalNotFound")}</p>}
        </div>
        <a href={POSTAL_LOOKUP_URL} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-medium text-primary hover:underline">
          {t("checkout.address.dontKnowPostal")}
        </a>
      </div>

      {placeAsText ? (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3 text-sm sm:col-span-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1">{place.city ?? place.municipality}, {place.state}</p>
          <button type="button" className="shrink-0 text-sm font-medium text-primary hover:underline" onClick={() => setEditPlace(true)}>
            {t("checkout.address.changePlace")}
          </button>
        </div>
      ) : (
        <>{input(f("city", "address-level2"))}{input(f("state", "address-level1"))}</>
      )}

      {neighborhoodSelect ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("neighborhood")}>{t("checkout.address.neighborhood")}</Label>
          <select id={id("neighborhood")} className={selectClass} autoComplete="address-level3" aria-invalid={!!nbErr}
            aria-describedby={nbErr ? `${id("neighborhood")}-error` : undefined}
            value={place.neighborhoods.some((n) => n.name === neighborhood) ? neighborhood : ""}
            onChange={(e) => {
              if (e.target.value === OTHER) {
                setOtherNeighborhood(true);
                setValue("neighborhood", "");
              } else setValue("neighborhood", e.target.value, { shouldValidate: true });
            }}>
            <option value="" disabled>{t("checkout.address.chooseNeighborhood")}</option>
            {place.neighborhoods.map((n) => (
              <option key={`${n.name}-${n.type}`} value={n.name}>{n.name} ({n.type})</option>
            ))}
            <option value={OTHER}>{t("checkout.address.otherNeighborhood")}</option>
          </select>
          {nbErr && <p id={`${id("neighborhood")}-error`} className="text-xs text-destructive">{nbErr}</p>}
        </div>
      ) : (
        input(f("neighborhood", "address-level3", { wide: true }))
      )}

      {input(f("street", "address-line1", { wide: true }))}
      {input(f("ext_number", "off"))}
      {input(f("int_number", "address-line2"))}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={id("references")}>{labels.references}</Label>
        <Input id={id("references")} autoComplete="off" maxLength={200} placeholder={t("checkout.address.referencesHint")}
          aria-invalid={!!errors.references} aria-describedby={errors.references ? `${id("references")}-error` : undefined}
          {...register("references")} />
        {errors.references && <p id={`${id("references")}-error`} className="text-xs text-destructive">{errors.references.message}</p>}
      </div>
      {input(f("recipient", "name", { wide: true }))}
      {input(f("phone", "tel-national", { inputMode: "tel" }))}

      {showDefault && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--blue)]" {...register("is_default")} />
          {t("checkout.address.makeDefault")}
        </label>
      )}
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="lg" disabled={isSubmitting} className="px-5">
          {isSubmitting ? t("common.loading") : (submitLabel ?? t("checkout.address.save"))}
        </Button>
        {onCancel && <Button type="button" variant="outline" size="lg" onClick={onCancel}>{t("checkout.address.cancel")}</Button>}
      </div>
    </form>
  );
}
