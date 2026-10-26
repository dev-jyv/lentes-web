"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { addCartItem, getGetCartQueryKey } from "@/lib/api/generated/cart/cart";
import { resolveVariant, useResolveVariant } from "@/lib/api/generated/catalog/catalog";
import type { ProductDetail, ProductOptions, ResolveVariantParams } from "@/lib/api/generated/model";
import { formatMxn } from "@/lib/format";

type EyeValues = { sphere: string; cylinder: string; axis: string; addition: string };
type FormValues = { od: EyeValues; os: EyeValues; base_curve: string; diameter: string };

const emptyEye: EyeValues = { sphere: "", cylinder: "", axis: "", addition: "" };
const required = z.string().min(1, "Requerido");
const maybe = (needed: boolean) => (needed ? required : z.string());

function buildSchema(o: ProductOptions) {
  const eye = z.object({
    sphere: required,
    cylinder: maybe(!!o.cylinders?.length),
    axis: maybe(!!o.axes?.length),
    addition: maybe(!!o.additions?.length),
  });
  return z.object({ od: eye, os: eye, base_curve: required, diameter: required });
}

const fmtSigned = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

function Field({
  label, value, onChange, options, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value || null} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder="Elegir" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function toParams(eye: EyeValues, base: string, dia: string): ResolveVariantParams | undefined {
  if (!eye.sphere || !base || !dia) return undefined;
  const p: ResolveVariantParams = {
    sphere: Number(eye.sphere), base_curve: Number(base), diameter: Number(dia),
  };
  if (eye.cylinder) p.cylinder = Number(eye.cylinder);
  if (eye.axis) p.axis = Number(eye.axis);
  if (eye.addition) p.addition = eye.addition;
  return p;
}

function VariantInfo({ slug, params }: { slug: string; params?: ResolveVariantParams }) {
  const { data, isFetching } = useResolveVariant(slug, params, {
    query: { enabled: !!params },
  });
  if (!params) return <p className="text-xs text-muted-foreground">Elige tu graduación.</p>;
  if (isFetching) return <p className="text-xs text-muted-foreground">Consultando…</p>;
  if (data?.status !== 200)
    return <p className="text-xs text-destructive">Esta combinación no está disponible.</p>;
  return (
    <p className="text-sm">
      <strong>{formatMxn(data.data.price_cents)}</strong>{" "}
      <span className={data.data.available > 0 ? "text-muted-foreground" : "text-destructive"}>
        {data.data.available > 0 ? "En existencia" : "Agotado"}
      </span>
    </p>
  );
}

function EyeBlock({
  title, name, control, product, errors,
}: {
  title: string; name: "od" | "os"; control: Control<FormValues>;
  product: ProductDetail;
  errors?: Partial<Record<keyof EyeValues, { message?: string }>>;
}) {
  const o = product.options;
  const [eye, base, dia] = useWatch({ control, name: [name, "base_curve", "diameter"] });
  const params = toParams(eye, base, dia);
  const complete = !!params && (!o.cylinders?.length || !!eye.cylinder) &&
    (!o.axes?.length || !!eye.axis) && (!o.additions?.length || !!eye.addition);

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="grid grid-cols-2 gap-3">
        <Controller control={control} name={`${name}.sphere`} render={({ field }) => (
          <Field label="Esfera" value={field.value} onChange={field.onChange}
            error={errors?.sphere?.message}
            options={o.spheres.map((s) => ({ value: String(s), label: fmtSigned(s) }))} />
        )} />
        {!!o.cylinders?.length && (
          <Controller control={control} name={`${name}.cylinder`} render={({ field }) => (
            <Field label="Cilindro" value={field.value} onChange={field.onChange}
              error={errors?.cylinder?.message}
              options={o.cylinders!.map((s) => ({ value: String(s), label: fmtSigned(s) }))} />
          )} />
        )}
        {!!o.axes?.length && (
          <Controller control={control} name={`${name}.axis`} render={({ field }) => (
            <Field label="Eje" value={field.value} onChange={field.onChange}
              error={errors?.axis?.message}
              options={o.axes!.map((s) => ({ value: String(s), label: `${s}°` }))} />
          )} />
        )}
        {!!o.additions?.length && (
          <Controller control={control} name={`${name}.addition`} render={({ field }) => (
            <Field label="Adición" value={field.value} onChange={field.onChange}
              error={errors?.addition?.message}
              options={o.additions!.map((s) => ({ value: s, label: s }))} />
          )} />
        )}
      </div>
      <VariantInfo slug={product.slug} params={complete ? params : undefined} />
    </fieldset>
  );
}

export function RxSelector({ product }: { product: ProductDetail }) {
  const o = product.options;
  const schema = useMemo(() => buildSchema(o), [o]);
  const { control, handleSubmit, getValues, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        od: emptyEye, os: emptyEye,
        base_curve: o.base_curves.length === 1 ? String(o.base_curves[0]) : "",
        diameter: o.diameters.length === 1 ? String(o.diameters[0]) : "",
      },
    });

  const router = useRouter();
  const queryClient = useQueryClient();
  const [boxes, setBoxes] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const [od, os] = await Promise.all([
      resolveVariant(product.slug, toParams(v.od, v.base_curve, v.diameter)),
      resolveVariant(product.slug, toParams(v.os, v.base_curve, v.diameter)),
    ]);
    if (od.status !== 200 || os.status !== 200) {
      return setError("Alguna combinación no está disponible.");
    }
    if (od.data.available < 1 || os.data.available < 1) {
      return setError("Alguna combinación está agotada.");
    }
    const quantity = Number(boxes);
    // Misma variante en ambos ojos: un solo renglón "both" (cajas por ojo).
    const lines = od.data.id === os.data.id
      ? [{ variant_id: od.data.id, eye: "both" as const, quantity }]
      : [
          { variant_id: od.data.id, eye: "right" as const, quantity },
          { variant_id: os.data.id, eye: "left" as const, quantity },
        ];
    let last;
    for (const line of lines) {
      last = await addCartItem(line);
      if (last.status !== 200) return setError("No pudimos agregar al carrito (¿sin stock?).");
    }
    queryClient.setQueryData(getGetCartQueryKey(), last);
    router.push("/carrito");
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <EyeBlock title="Ojo derecho (OD)" name="od" control={control} product={product}
          errors={errors.od} />
        <EyeBlock title="Ojo izquierdo (OI)" name="os" control={control} product={product}
          errors={errors.os} />
      </div>
      <Button type="button" variant="outline" size="sm"
        onClick={() => setValue("os", { ...getValues("od") }, { shouldValidate: true })}>
        Misma graduación en ambos ojos
      </Button>
      {(o.base_curves.length > 1 || o.diameters.length > 1) && (
        <div className="grid grid-cols-2 gap-3">
          {o.base_curves.length > 1 && (
            <Controller control={control} name="base_curve" render={({ field }) => (
              <Field label="Curva base" value={field.value} onChange={field.onChange}
                error={errors.base_curve?.message}
                options={o.base_curves.map((s) => ({ value: String(s), label: s.toFixed(1) }))} />
            )} />
          )}
          {o.diameters.length > 1 && (
            <Controller control={control} name="diameter" render={({ field }) => (
              <Field label="Diámetro" value={field.value} onChange={field.onChange}
                error={errors.diameter?.message}
                options={o.diameters.map((s) => ({ value: String(s), label: s.toFixed(1) }))} />
            )} />
          )}
        </div>
      )}
      <div className="max-w-[10rem]">
        <Field label="Cajas por ojo" value={boxes} onChange={setBoxes}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        Agregar al carrito
      </Button>
      <p className="text-xs text-muted-foreground">
        Curva base {o.base_curves.join(" / ")} · Diámetro {o.diameters.join(" / ")} mm
      </p>
    </form>
  );
}
