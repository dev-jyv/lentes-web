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
import { addCartItem, getGetCartQueryKey, getProductVariant, useGetProductVariant } from "@/lib/api/generated/api";
import type { GetProductVariantParams, ProductDetail, ProductOptions } from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { formatMxn } from "@/lib/format";
import { t } from "@/lib/i18n";

type EyeValues = { sphere: string; cylinder: string; axis: string; addition: string };
type FormValues = { od: EyeValues; os: EyeValues; base_curve: string; diameter: string };

const emptyEye: EyeValues = { sphere: "", cylinder: "", axis: "", addition: "" };
const required = z.string().min(1, t("validation.required"));
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
  label, abbr, value, onChange, options, error, optical = true,
}: {
  label: string; abbr?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; error?: string; optical?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="gap-1.5 text-xs">
        {abbr && <span className="optic text-[10px] font-medium tracking-widest text-primary">{abbr}</span>}
        {label}
      </Label>
      <Select items={options} value={value || null} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={t("common.choose")} className={optical ? "optic" : undefined} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className={optical ? "optic" : undefined}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function toParams(eye: EyeValues, base: string, dia: string): GetProductVariantParams | undefined {
  if (!eye.sphere || !base || !dia) return undefined;
  const p: GetProductVariantParams = {
    sphere: Number(eye.sphere), base_curve: Number(base), diameter: Number(dia),
  };
  if (eye.cylinder) p.cylinder = Number(eye.cylinder);
  if (eye.axis) p.axis = Number(eye.axis);
  if (eye.addition) p.addition = eye.addition;
  return p;
}

function VariantInfo({ slug, params }: { slug: string; params?: GetProductVariantParams }) {
  if (!params) return <p className="text-xs text-muted-foreground">{t("rx.selector.chooseRx")}</p>;
  return <VariantPrice slug={slug} params={params} />;
}

function VariantPrice({ slug, params }: { slug: string; params: GetProductVariantParams }) {
  const { data, isFetching } = useGetProductVariant(slug, params);
  if (isFetching) return <p className="text-xs text-muted-foreground">{t("rx.selector.checking")}</p>;
  if (data?.status !== 200)
    return <p className="text-xs text-destructive">{t("rx.selector.comboUnavailable")}</p>;
  return (
    // El precio "rueda" al cambiar la graduación (220 ms); la key reinicia la animación.
    <p className="text-sm">
      <strong key={data.data.price_cents} className="inline-block animate-roll font-display text-lg">
        {formatMxn(data.data.price_cents)}
      </strong>{" "}
      <span className={data.data.available > 0 ? "text-good" : "text-destructive"}>
        {data.data.available > 0 ? t("rx.selector.inStock") : t("product.soldOut")}
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
    <fieldset className="space-y-3 rounded-xl border bg-card p-4">
      <legend className="optic px-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">{title}</legend>
      <div className="grid grid-cols-2 gap-3">
        <Controller control={control} name={`${name}.sphere`} render={({ field }) => (
          <Field label={t("rx.form.sphere")} abbr={t("rx.selector.abbr.sphere")} value={field.value} onChange={field.onChange}
            error={errors?.sphere?.message}
            options={o.spheres.map((s) => ({ value: String(s), label: fmtSigned(s) }))} />
        )} />
        {!!o.cylinders?.length && (
          <Controller control={control} name={`${name}.cylinder`} render={({ field }) => (
            <Field label={t("rx.form.cylinder")} abbr={t("rx.selector.abbr.cylinder")} value={field.value} onChange={field.onChange}
              error={errors?.cylinder?.message}
              options={o.cylinders!.map((s) => ({ value: String(s), label: fmtSigned(s) }))} />
          )} />
        )}
        {!!o.axes?.length && (
          <Controller control={control} name={`${name}.axis`} render={({ field }) => (
            <Field label={t("rx.form.axis")} abbr={t("rx.selector.abbr.axis")} value={field.value} onChange={field.onChange}
              error={errors?.axis?.message}
              options={o.axes!.map((s) => ({ value: String(s), label: `${s}°` }))} />
          )} />
        )}
        {!!o.additions?.length && (
          <Controller control={control} name={`${name}.addition`} render={({ field }) => (
            <Field label={t("rx.form.addition")} abbr={t("rx.selector.abbr.addition")} value={field.value} onChange={field.onChange}
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
      getProductVariant(product.slug, toParams(v.od, v.base_curve, v.diameter)!),
      getProductVariant(product.slug, toParams(v.os, v.base_curve, v.diameter)!),
    ]);
    if (od.status !== 200 || os.status !== 200) {
      return setError(t("rx.selector.someUnavailable"));
    }
    if (od.data.available < 1 || os.data.available < 1) {
      return setError(t("rx.selector.someSoldOut"));
    }
    const quantity = Number(boxes);
    // Un renglón por ojo: así no hay ambigüedad sobre cuántas cajas se cobran.
    const lines = [
      { variant_id: od.data.id, eye: "right" as const, quantity },
      { variant_id: os.data.id, eye: "left" as const, quantity },
    ];
    for (const line of lines) {
      const res = await addCartItem(line);
      if (res.status !== 201) {
        await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        return setError(
          res.status === 409
            ? t("rx.selector.notEnoughStock")
            : t("frames.addFailed"),
        );
      }
    }
    await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    track("add_to_cart", { slug: product.slug, name: product.name, boxes_per_eye: quantity, category: "contact_lens", lens_package: null });
    router.push("/carrito");
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <EyeBlock title={t("rx.form.rightEye")} name="od" control={control} product={product}
          errors={errors.od} />
        <EyeBlock title={t("rx.form.leftEye")} name="os" control={control} product={product}
          errors={errors.os} />
      </div>
      <Button type="button" variant="outline" size="sm"
        onClick={() => setValue("os", { ...getValues("od") }, { shouldValidate: true })}>
        {t("rx.selector.sameBoth")}
      </Button>
      {(o.base_curves.length > 1 || o.diameters.length > 1) && (
        <div className="grid grid-cols-2 gap-3">
          {o.base_curves.length > 1 && (
            <Controller control={control} name="base_curve" render={({ field }) => (
              <Field label={t("rx.selector.baseCurve")} abbr={t("rx.selector.abbr.baseCurve")} value={field.value} onChange={field.onChange}
                error={errors.base_curve?.message}
                options={o.base_curves.map((s) => ({ value: String(s), label: s.toFixed(1) }))} />
            )} />
          )}
          {o.diameters.length > 1 && (
            <Controller control={control} name="diameter" render={({ field }) => (
              <Field label={t("rx.selector.diameter")} abbr={t("rx.selector.abbr.diameter")} value={field.value} onChange={field.onChange}
                error={errors.diameter?.message}
                options={o.diameters.map((s) => ({ value: String(s), label: s.toFixed(1) }))} />
            )} />
          )}
        </div>
      )}
      <div className="max-w-[10rem]">
        <Field label={t("rx.selector.boxesPerEye")} optical={false} value={boxes} onChange={setBoxes}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {t("frames.addToCart")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t("rx.selector.specs", { baseCurves: o.base_curves.join(" / "), diameters: o.diameters.join(" / ") })}
      </p>
    </form>
  );
}
