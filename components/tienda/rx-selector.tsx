"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  addCartItem, getGetCartQueryKey, getProductVariant, useGetProductVariant, type GetProductVariantQueryResult,
} from "@/lib/api/generated/api";
import type { GetProductVariantParams, ProductDetail, ProductOptions } from "@/lib/api/generated/model";
import { track } from "@/lib/analytics";
import { formatMxn, replacementLabel } from "@/lib/format";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

type EyeValues = { sphere: string; cylinder: string; axis: string; addition: string; dominance: string };
type FormValues = { od: EyeValues; os: EyeValues; base_curve: string; diameter: string };

const emptyEye: EyeValues = { sphere: "", cylinder: "", axis: "", addition: "", dominance: "" };
const required = z.string().min(1, t("validation.required"));
const maybe = (needed: boolean) => (needed ? required : z.string());

function buildSchema(o: ProductOptions) {
  const eye = z.object({
    sphere: required,
    cylinder: maybe(!!o.cylinders?.length),
    axis: maybe(!!o.axes?.length),
    addition: maybe(!!o.additions?.length),
    dominance: maybe(!!o.dominances?.length),
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
  if (eye.dominance) p.dominance = eye.dominance;
  return p;
}

type VariantQuery = UseQueryResult<GetProductVariantQueryResult, unknown>;

// Graduación completa de un ojo para consultar su variante; `undefined` si falta algún campo.
function completeParams(o: ProductOptions, eye: EyeValues, base: string, dia: string) {
  const params = toParams(eye, base, dia);
  const complete = !!params && (!o.cylinders?.length || !!eye.cylinder) &&
    (!o.axes?.length || !!eye.axis) && (!o.additions?.length || !!eye.addition) &&
    (!o.dominances?.length || !!eye.dominance);
  return complete ? params : undefined;
}

function useVariant(slug: string, params?: GetProductVariantParams) {
  // Sin graduación completa la consulta queda apagada; los parámetros de relleno no se envían.
  return useGetProductVariant(slug, params ?? { sphere: 0, base_curve: 0, diameter: 0 }, { query: { enabled: !!params } });
}

// Variante resuelta del ojo, o `undefined` mientras falta graduación o se consulta.
const resolved = (q: VariantQuery, params?: GetProductVariantParams) =>
  params && !q.isFetching && q.data?.status === 200 ? q.data.data : undefined;

// El ojo impide agregar: combinación inexistente, agotada o con menos existencias que cajas.
function blocked(q: VariantQuery, params: GetProductVariantParams | undefined, boxes: number) {
  if (!params || q.isFetching || !q.data) return false;
  if (q.data.status !== 200) return true;
  return q.data.data.available < 1 || (!q.data.data.on_demand && q.data.data.available < boxes);
}

function VariantInfo({ query, params, boxes }: { query: VariantQuery; params?: GetProductVariantParams; boxes: number }) {
  if (!params) return <p className="text-xs text-muted-foreground">{t("rx.selector.chooseRx")}</p>;
  const { data, isFetching } = query;
  if (isFetching) return <p className="text-xs text-muted-foreground">{t("rx.selector.checking")}</p>;
  if (data?.status !== 200)
    return <p className="text-xs text-destructive">{t("rx.selector.comboUnavailable")}</p>;
  const v = data.data;
  return (
    <>
      {/* El precio "rueda" al cambiar la graduación (220 ms); la key reinicia la animación. */}
      <p className="text-sm">
        <strong key={v.price_cents} className="inline-block animate-roll font-display text-lg">
          {formatMxn(v.price_cents)}
        </strong>{" "}
        {v.on_demand ? (
          <span className="text-muted-foreground">{t("rx.selector.onDemand")}</span>
        ) : (
          <span className={v.available > 0 ? "text-good" : "text-destructive"}>
            {v.available > 0 ? t("rx.selector.inStock") : t("product.soldOut")}
          </span>
        )}
      </p>
      {!v.on_demand && v.available > 0 && v.available < boxes && (
        <p className="text-xs text-destructive">{t("rx.selector.notEnoughStock")}</p>
      )}
    </>
  );
}

const boxOptions = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

function EyeBlock({
  title, name, control, product, errors, query, params, boxes, onBoxes,
}: {
  title: string; name: "od" | "os"; control: Control<FormValues>;
  product: ProductDetail;
  errors?: Partial<Record<keyof EyeValues, { message?: string }>>;
  query: VariantQuery; params?: GetProductVariantParams;
  boxes: string; onBoxes: (v: string) => void;
}) {
  const o = product.options;

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
        {!!o.dominances?.length && (
          <Controller control={control} name={`${name}.dominance`} render={({ field }) => (
            <Field label={t("rx.selector.dominance")} abbr={t("rx.selector.abbr.dominance")} value={field.value} onChange={field.onChange}
              error={errors?.dominance?.message}
              options={o.dominances!.map((s) => ({ value: s, label: s }))} />
          )} />
        )}
        <Field label={t("rx.selector.boxes")} optical={false} value={boxes} onChange={(v) => onBoxes(v || "1")}
          options={boxOptions} />
      </div>
      <VariantInfo query={query} params={params} boxes={Number(boxes)} />
    </fieldset>
  );
}

export function RxSelector({ product }: { product: ProductDetail }) {
  const o = product.options;
  const soldOut = product.from_price_cents == null;
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
  const [boxesOd, setBoxesOd] = useState("1");
  const [boxesOs, setBoxesOs] = useState("1");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Renglones ya agregados: al reintentar tras un fallo parcial no se duplica el primer ojo.
  const added = useRef(new Set<string>());

  const [odEye, osEye, base, dia] = useWatch({ control, name: ["od", "os", "base_curve", "diameter"] });
  const odParams = completeParams(o, odEye, base, dia);
  const osParams = completeParams(o, osEye, base, dia);
  const odQuery = useVariant(product.slug, odParams);
  const osQuery = useVariant(product.slug, osParams);
  const od = resolved(odQuery, odParams);
  const os = resolved(osQuery, osParams);
  const shown = od ?? os;
  const subtotal = od && os ? Number(boxesOd) * od.price_cents + Number(boxesOs) * os.price_cents : null;
  const disabled = soldOut || isSubmitting ||
    blocked(odQuery, odParams, Number(boxesOd)) || blocked(osQuery, osParams, Number(boxesOs));

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    if (!confirmed) return setError(t("rx.selector.confirmRequired"));
    const [odRes, osRes] = await Promise.all([
      getProductVariant(product.slug, toParams(v.od, v.base_curve, v.diameter)!),
      getProductVariant(product.slug, toParams(v.os, v.base_curve, v.diameter)!),
    ]);
    if (odRes.status !== 200 || osRes.status !== 200) {
      return setError(t("rx.selector.someUnavailable"));
    }
    if (odRes.data.available < 1 || osRes.data.available < 1) {
      return setError(t("rx.selector.someSoldOut"));
    }
    // Un renglón por ojo, cada uno con sus cajas.
    const lines = [
      { variant_id: odRes.data.id, eye: "right" as const, quantity: Number(boxesOd), on_demand: odRes.data.on_demand, available: odRes.data.available },
      { variant_id: osRes.data.id, eye: "left" as const, quantity: Number(boxesOs), on_demand: osRes.data.on_demand, available: osRes.data.available },
    ];
    if (lines.some((l) => !l.on_demand && l.available < l.quantity)) {
      return setError(t("rx.selector.notEnoughStock"));
    }
    const key = (l: (typeof lines)[number]) => `${l.variant_id}:${l.eye}:${l.quantity}`;
    for (const l of lines) {
      if (added.current.has(key(l))) continue;
      const res = await addCartItem({ variant_id: l.variant_id, eye: l.eye, quantity: l.quantity });
      if (res.status !== 201) {
        await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        return setError(
          l.eye === "left" && added.current.has(key(lines[0]))
            ? t("rx.selector.partialAdded")
            : res.status === 409 ? t("rx.selector.notEnoughStock") : t("frames.addFailed"),
        );
      }
      added.current.add(key(l));
    }
    added.current.clear();
    await queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    track("add_to_cart", {
      slug: product.slug, name: product.name, boxes_od: lines[0].quantity, boxes_os: lines[1].quantity,
      category: "contact_lens", lens_package: null,
    });
    router.push("/carrito");
  });

  const packaging = product.replacement && product.pieces_per_box != null
    ? t("lenses.packaging", { replacement: replacementLabel[product.replacement], count: product.pieces_per_box })
    : product.pieces_per_box != null ? t("lenses.piecesPerBox", { count: product.pieces_per_box })
    : product.replacement ? replacementLabel[product.replacement] : null;
  const strong = (c: ReactNode) => <strong className="font-display text-2xl">{c}</strong>;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-lg">
          {soldOut ? (
            <strong>{t("product.soldOut")}</strong>
          ) : shown ? (
            <>
              {rich(t("lenses.pricePerBox", { price: formatMxn(shown.price_cents) }), { price: strong })}
              {shown.compare_at_cents != null && (
                <s className="ml-2 text-sm text-muted-foreground">{formatMxn(shown.compare_at_cents)}</s>
              )}
            </>
          ) : (
            rich(t("lenses.fromPricePerBox", { price: formatMxn(product.from_price_cents!) }), { price: strong })
          )}
        </p>
        {packaging && <p className="text-sm text-muted-foreground">{packaging}</p>}
      </div>
      <form onSubmit={onSubmit} className="ph-no-capture">
        <fieldset disabled={soldOut} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <EyeBlock title={t("rx.form.rightEye")} name="od" control={control} product={product}
              errors={errors.od} query={odQuery} params={odParams} boxes={boxesOd} onBoxes={setBoxesOd} />
            <EyeBlock title={t("rx.form.leftEye")} name="os" control={control} product={product}
              errors={errors.os} query={osQuery} params={osParams} boxes={boxesOs} onBoxes={setBoxesOs} />
          </div>
          {/* Copia la graduación, no las cajas. */}
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
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)} />
            <span>{t("rx.selector.confirm")}</span>
          </label>
          {subtotal != null && (
            <p className="flex items-baseline justify-between border-t pt-4">
              <span>{t("rx.selector.subtotal")}</span>
              <strong className="font-display text-xl">{formatMxn(subtotal)}</strong>
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={disabled}>
            {isSubmitting ? t("frames.adding") : t("frames.addToCart")}
          </Button>
          <p className="optic text-xs text-muted-foreground">
            {t("rx.selector.specs", { baseCurves: o.base_curves.join(" / "), diameters: o.diameters.join(" / ") })}
          </p>
        </fieldset>
      </form>
    </div>
  );
}
