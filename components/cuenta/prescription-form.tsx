"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPrescription, createPrescriptionUploadUrl, getListPrescriptionsQueryKey,
} from "@/lib/api/provisional/api";
import { ALLOWED_TYPES, MAX_FILE_BYTES, type AllowedType } from "@/lib/prescription";

const power = z.string().trim().refine(
  (v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= -20 && Number(v) <= 20 && (Number(v) * 4) % 1 === 0,
  "Número en pasos de 0.25",
);
const optPower = z.string().trim().refine(
  (v) => v === "" || (!Number.isNaN(Number(v)) && (Number(v) * 4) % 1 === 0), "Pasos de 0.25",
);
const optAxis = z.string().trim().refine(
  (v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 180), "0 a 180",
);

const schema = z.object({
  od_sphere: power, od_cylinder: optPower, od_axis: optAxis, od_addition: z.string(),
  os_sphere: power, os_cylinder: optPower, os_axis: optAxis, os_addition: z.string(),
  issued_at: z.string().min(1, "Requerido"),
  expires_at: z.string().min(1, "Requerido"),
  doctor_name: z.string().trim().min(2, "Requerido"),
  doctor_license: z.string(),
}).refine((v) => v.expires_at >= v.issued_at, {
  path: ["expires_at"], message: "Debe ser posterior a la fecha de emisión",
}).refine((v) => !v.od_cylinder || v.od_axis, { path: ["od_axis"], message: "Requerido con cilindro" })
  .refine((v) => !v.os_cylinder || v.os_axis, { path: ["os_axis"], message: "Requerido con cilindro" });
type Values = z.infer<typeof schema>;

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

export function PrescriptionForm() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: {
        od_sphere: "", od_cylinder: "", od_axis: "", od_addition: "",
        os_sphere: "", os_cylinder: "", os_axis: "", os_addition: "",
        issued_at: "", expires_at: "", doctor_name: "", doctor_license: "",
      },
    });

  function pick(f: File | null) {
    setFileError(null);
    setFile(null);
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type as AllowedType)) return setFileError("Usa JPG, PNG, WebP o PDF.");
    if (f.size > MAX_FILE_BYTES) return setFileError("El archivo pesa más de 10 MB.");
    setFile(f);
  }

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    setDone(false);
    if (!file) return setFileError("Sube una foto o PDF de tu receta.");

    // 1) URL prefirmada de R2  2) PUT directo desde el navegador  3) registrar la receta
    const up = await createPrescriptionUploadUrl({
      content_type: file.type as AllowedType, size_bytes: file.size,
    });
    if (up.status !== 200) return setError("No pudimos preparar la subida. Intenta de nuevo.");
    const put = await fetch(up.data.upload_url, {
      method: "PUT", body: file, headers: { "Content-Type": file.type },
    }).catch(() => null);
    if (!put?.ok) return setError("No pudimos subir el archivo. Intenta de nuevo.");

    const res = await createPrescription({
      r2_key: up.data.r2_key,
      od_sphere: Number(v.od_sphere), od_cylinder: num(v.od_cylinder),
      od_axis: num(v.od_axis), od_addition: str(v.od_addition),
      os_sphere: Number(v.os_sphere), os_cylinder: num(v.os_cylinder),
      os_axis: num(v.os_axis), os_addition: str(v.os_addition),
      issued_at: v.issued_at, expires_at: v.expires_at,
      doctor_name: v.doctor_name.trim(), doctor_license: str(v.doctor_license),
    });
    if (res.status !== 201) return setError("No pudimos guardar tu receta.");
    await queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() });
    reset();
    setFile(null);
    setDone(true);
  });

  const e = errors as Record<string, { message?: string } | undefined>;
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="file">Foto o PDF de tu receta (máx. 10 MB)</Label>
        <Input id="file" type="file" accept={ALLOWED_TYPES.join(",")}
          onChange={(ev) => pick(ev.target.files?.[0] ?? null)} />
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      </div>
      {(["od", "os"] as const).map((eye) => (
        <fieldset key={eye} className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">
            {eye === "od" ? "Ojo derecho (OD)" : "Ojo izquierdo (OI)"}
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input2 label="Esfera" name={`${eye}_sphere`} errors={e} register={register} placeholder="-2.50" />
            <Input2 label="Cilindro" name={`${eye}_cylinder`} errors={e} register={register} />
            <Input2 label="Eje" name={`${eye}_axis`} errors={e} register={register} />
            <Input2 label="Adición" name={`${eye}_addition`} errors={e} register={register} />
          </div>
        </fieldset>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input2 label="Fecha de emisión" name="issued_at" type="date" errors={e} register={register} />
        <Input2 label="Vigente hasta" name="expires_at" type="date" errors={e} register={register} />
        <Input2 label="Nombre del optometrista" name="doctor_name" errors={e} register={register} />
        <Input2 label="Cédula profesional (opcional)" name="doctor_license" errors={e} register={register} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {done && <p role="status" className="text-sm">Receta enviada. La revisaremos pronto.</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar receta"}
      </Button>
    </form>
  );
}
