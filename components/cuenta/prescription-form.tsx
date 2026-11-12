"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPrescription, createPrescriptionUploadUrl, getListPrescriptionsQueryKey,
} from "@/lib/api/generated/api";
import type { PrescriptionKind } from "@/lib/api/generated/model";
import { ALLOWED_TYPES, MAX_FILE_BYTES, type AllowedType } from "@/lib/prescription";
import { t } from "@/lib/i18n";

const power = z.string().trim().refine(
  (v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= -20 && Number(v) <= 20 && (Number(v) * 4) % 1 === 0,
  t("validation.powerStep"),
);
const optPower = z.string().trim().refine(
  (v) => v === "" || (!Number.isNaN(Number(v)) && (Number(v) * 4) % 1 === 0), t("validation.quarterSteps"),
);
const optAxis = z.string().trim().refine(
  (v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 180), t("validation.axisRange"),
);

const schema = z.object({
  od_sphere: power, od_cylinder: optPower, od_axis: optAxis, od_addition: z.string(),
  os_sphere: power, os_cylinder: optPower, os_axis: optAxis, os_addition: z.string(),
  issued_at: z.string().min(1, t("validation.required")),
  expires_at: z.string().min(1, t("validation.required")),
  doctor_name: z.string().trim().min(2, t("validation.required")),
  doctor_license: z.string(),
  kind: z.enum(["contact_lens", "glasses"]),
  pd_mm: z.string().trim().refine(
    (v) => v === "" || (/^\d{2}(\.\d)?$/.test(v) && Number(v) >= 40 && Number(v) <= 80), t("validation.pdRange"),
  ),
}).refine((v) => v.expires_at >= v.issued_at, {
  path: ["expires_at"], message: t("validation.expiresAfterIssue"),
}).refine((v) => !v.od_cylinder || v.od_axis, { path: ["od_axis"], message: t("validation.axisWithCylinder") })
  .refine((v) => !v.os_cylinder || v.os_axis, { path: ["os_axis"], message: t("validation.axisWithCylinder") });
type Values = z.infer<typeof schema>;

// La API responde 400/409 con un `detail` en español apto para el cliente (valores inválidos, tope de recetas en revisión).
function apiMessage(res: { status: number; data?: unknown }, fallback: string) {
  const detail = (res.data as { detail?: string } | undefined)?.detail;
  if (res.status === 503) return t("rx.form.unavailable");
  return (res.status === 400 || res.status === 409) && detail ? detail : fallback;
}

const num = (v: string) => (v === "" ? null : Number(v));
const str = (v: string) => (v.trim() === "" ? null : v.trim());

function Input2({
  label, name, errors, register, type = "text", placeholder,
}: {
  label: string; name: keyof Values; errors: Record<string, { message?: string } | undefined>;
  register: ReturnType<typeof useForm<Values>>["register"]; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} aria-invalid={!!errors[name]}
        {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );
}

// `kind` fija el tipo y oculta su selector (configurador de micas, SPEC 17). `onCreated` avisa la receta creada
// y `onUnauthorized` una sesión expirada, para pedir iniciar sesión sin perder lo elegido.
export function PrescriptionForm({ kind: fixedKind, onCreated, onUnauthorized }: {
  kind?: PrescriptionKind; onCreated?: (id: string) => void; onUnauthorized?: () => void;
} = {}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: {
        od_sphere: "", od_cylinder: "", od_axis: "", od_addition: "",
        os_sphere: "", os_cylinder: "", os_axis: "", os_addition: "",
        issued_at: "", expires_at: "", doctor_name: "", doctor_license: "", kind: fixedKind ?? "contact_lens", pd_mm: "",
      },
    });

  const kind = useWatch({ control, name: "kind" });

  function pick(f: File | null) {
    setFileError(null);
    setFile(null);
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type as AllowedType)) return setFileError(t("rx.form.badFileType"));
    if (f.size > MAX_FILE_BYTES) return setFileError(t("rx.form.fileTooLarge"));
    setFile(f);
  }

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    setDone(false);
    if (!file) return setFileError(t("rx.form.fileRequired"));

    // 1) URL prefirmada de R2  2) PUT directo desde el navegador  3) registrar la receta
    const up = await createPrescriptionUploadUrl({
      content_type: file.type as AllowedType, size_bytes: file.size,
    });
    if (Number(up.status) === 401 && onUnauthorized) return onUnauthorized();
    if (up.status !== 200) return setError(apiMessage(up, t("rx.form.prepareFailed")));
    const put = await fetch(up.data.upload_url, {
      method: "PUT", body: file, headers: { "Content-Type": file.type },
    }).catch(() => null);
    if (!put?.ok) return setError(t("rx.form.uploadFailed"));

    const res = await createPrescription({
      r2_key: up.data.r2_key,
      od_sphere: Number(v.od_sphere), od_cylinder: num(v.od_cylinder),
      od_axis: num(v.od_axis), od_addition: str(v.od_addition),
      os_sphere: Number(v.os_sphere), os_cylinder: num(v.os_cylinder),
      os_axis: num(v.os_axis), os_addition: str(v.os_addition),
      issued_at: v.issued_at, expires_at: v.expires_at,
      doctor_name: v.doctor_name.trim(), doctor_license: str(v.doctor_license),
      kind: v.kind, pd_mm: v.kind === "glasses" ? num(v.pd_mm) : null,
    });
    if (Number(res.status) === 401 && onUnauthorized) return onUnauthorized();
    if (res.status !== 201) return setError(apiMessage(res, t("rx.form.saveFailed")));
    await queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
    reset();
    setFile(null);
    setDone(true);
    onCreated?.(res.data.id);
  });

  const e = errors as Record<string, { message?: string } | undefined>;
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {!fixedKind && (
        <div className="space-y-1">
          <Label htmlFor="kind" className="text-xs">{t("rx.form.kind")}</Label>
          <select id="kind" className="h-11 w-full max-w-xs rounded-lg border bg-card px-3 text-sm" {...register("kind")}>
            <option value="contact_lens">{t("common.contactLenses")}</option>
            <option value="glasses">{t("common.frames")}</option>
          </select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="file">{t("rx.form.file")}</Label>
        <Input id="file" type="file" accept={ALLOWED_TYPES.join(",")}
          onChange={(ev) => pick(ev.target.files?.[0] ?? null)} />
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      </div>
      {(["od", "os"] as const).map((eye) => (
        <fieldset key={eye} className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">
            {eye === "od" ? t("rx.form.rightEye") : t("rx.form.leftEye")}
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input2 label={t("rx.form.sphere")} name={`${eye}_sphere`} errors={e} register={register} placeholder="-2.50" />
            <Input2 label={t("rx.form.cylinder")} name={`${eye}_cylinder`} errors={e} register={register} />
            <Input2 label={t("rx.form.axis")} name={`${eye}_axis`} errors={e} register={register} />
            <Input2 label={t("rx.form.addition")} name={`${eye}_addition`} errors={e} register={register} />
          </div>
        </fieldset>
      ))}
      {kind === "glasses" && (
        <div className="max-w-xs">
          <Input2 label={t("rx.form.pd")} name="pd_mm" placeholder="63.5" errors={e} register={register} />
          <p className="mt-1 text-xs text-muted-foreground">{t("rx.form.pdHint")}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input2 label={t("rx.form.issuedAt")} name="issued_at" type="date" errors={e} register={register} />
        <Input2 label={t("rx.form.expiresAt")} name="expires_at" type="date" errors={e} register={register} />
        <Input2 label={t("rx.form.doctor")} name="doctor_name" errors={e} register={register} />
        <Input2 label={t("rx.form.license")} name="doctor_license" errors={e} register={register} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {done && <p role="status" className="text-sm">{t("rx.form.sent")}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("rx.form.sending") : t("rx.form.submit")}
      </Button>
    </form>
  );
}
