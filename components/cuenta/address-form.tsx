"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAddress, getListAddressesQueryKey, updateAddress } from "@/lib/api/generated/api";
import type { Address } from "@/lib/api/generated/model";
import { t } from "@/lib/i18n";

const req = z.string().trim().min(1, t("validation.required"));
const schema = z.object({
  recipient: req, street: req, ext_number: req, int_number: z.string(),
  neighborhood: req, city: req, state: req,
  postal_code: z.string().regex(/^\d{5}$/, t("validation.fiveDigits")),
  phone: z.string().regex(/^\d{10}$/, t("validation.tenDigits")),
  is_default: z.boolean(),
});
type AddressValues = z.infer<typeof schema>;

const fields: { name: Exclude<keyof AddressValues, "is_default">; label: string; autoComplete: string; inputMode?: "numeric" | "tel"; wide?: boolean }[] = [
  { name: "recipient", label: t("checkout.address.recipient"), autoComplete: "name", wide: true },
  { name: "street", label: t("checkout.address.street"), autoComplete: "address-line1", wide: true },
  { name: "ext_number", label: t("checkout.address.extNumber"), autoComplete: "off" },
  { name: "int_number", label: t("checkout.address.intNumber"), autoComplete: "address-line2" },
  { name: "neighborhood", label: t("checkout.address.neighborhood"), autoComplete: "address-level3", wide: true },
  { name: "city", label: t("checkout.address.city"), autoComplete: "address-level2" },
  { name: "state", label: t("checkout.address.state"), autoComplete: "address-level1" },
  { name: "postal_code", label: t("checkout.address.postalCode"), autoComplete: "postal-code", inputMode: "numeric" },
  { name: "phone", label: t("checkout.address.phone"), autoComplete: "tel-national", inputMode: "tel" },
];

// Formulario de dirección compartido por el checkout (SPEC 19) y la libreta de direcciones (SPEC 21).
export function AddressForm({
  address, onSaved, onCancel, showDefault = false, idPrefix = "address",
}: {
  address?: Address;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  showDefault?: boolean;
  idPrefix?: string;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddressValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipient: address?.recipient ?? "", street: address?.street ?? "", ext_number: address?.ext_number ?? "",
      int_number: address?.int_number ?? "", neighborhood: address?.neighborhood ?? "", city: address?.city ?? "",
      state: address?.state ?? "", postal_code: address?.postal_code ?? "", phone: address?.phone ?? "",
      is_default: address?.is_default ?? !showDefault,
    },
    shouldFocusError: true,
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(async (v) => {
      setError(null);
      const body = { ...v, int_number: v.int_number.trim() || null };
      const res = address ? await updateAddress(address.id, body) : await createAddress(body);
      if (res.status !== 200 && res.status !== 201) {
        return setError((res.data as { detail?: string } | undefined)?.detail ?? t("checkout.address.saveFailed"));
      }
      await queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
      onSaved(res.data as Address);
    })}>
      {fields.map((f) => {
        const id = `${idPrefix}-${f.name}`;
        const err = errors[f.name]?.message;
        return (
          <div key={f.name} className={f.wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
            <Label htmlFor={id}>{f.label}</Label>
            <Input id={id} autoComplete={f.autoComplete} inputMode={f.inputMode} aria-invalid={!!err}
              aria-describedby={err ? `${id}-error` : undefined} {...register(f.name)} />
            {err && <p id={`${id}-error`} className="text-xs text-destructive">{err}</p>}
          </div>
        );
      })}
      {showDefault && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--blue)]" {...register("is_default")} />
          {t("checkout.address.makeDefault")}
        </label>
      )}
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="lg" disabled={isSubmitting} className="px-5">
          {isSubmitting ? t("common.loading") : t("checkout.address.save")}
        </Button>
        {onCancel && <Button type="button" variant="outline" size="lg" onClick={onCancel}>{t("checkout.address.cancel")}</Button>}
      </div>
    </form>
  );
}
