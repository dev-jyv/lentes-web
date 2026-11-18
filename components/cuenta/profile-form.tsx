"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getGetMeQueryKey, updateMe, useGetMe } from "@/lib/api/generated/api";
import type { Customer } from "@/lib/api/generated/model";
import { LEGAL_REVIEWED } from "@/lib/legal";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const schema = z.object({
  full_name: z.string().trim().min(2, t("account.profile.nameLength")).max(120, t("account.profile.nameLength")),
  phone: z.string().transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => v === "" || /^\d{10}$/.test(v), t("validation.tenDigits")),
  marketing_opt_in: z.boolean(),
});
type Values = z.input<typeof schema>;

const legalLinks = {
  terms: (c: string) => <Link href="/terminos" className="underline">{c}</Link>,
  privacy: (c: string) => <Link href="/privacidad" className="underline">{c}</Link>,
};

function Form({ customer }: { customer: Customer }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: customer.full_name ?? "", phone: customer.phone ?? "", marketing_opt_in: customer.marketing_opt_in },
  });

  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit(async (v) => {
      setError(null);
      const res = await updateMe({
        full_name: v.full_name,
        phone: v.phone || null,
        // Sin textos legales revisados no se ofrece la casilla y se conserva el valor actual.
        marketing_opt_in: LEGAL_REVIEWED ? v.marketing_opt_in : customer.marketing_opt_in,
      });
      if (res.status !== 200) return setError((res.data as { detail?: string } | undefined)?.detail ?? t("checkout.errors.generic"));
      queryClient.setQueryData(getGetMeQueryKey(), res);
      reset({ full_name: res.data.full_name ?? "", phone: res.data.phone ?? "", marketing_opt_in: res.data.marketing_opt_in });
      toast.success(t("account.profile.saved"));
    })}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="profile-full_name">{t("account.profile.fullName")}</Label>
          <Input id="profile-full_name" autoComplete="name" aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? "profile-full_name-error" : undefined} {...register("full_name")} />
          {errors.full_name && <p id="profile-full_name-error" className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">{t("account.profile.phone")}</Label>
          <Input id="profile-phone" type="tel" inputMode="tel" autoComplete="tel-national" aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "profile-phone-error" : undefined} {...register("phone")} />
          {errors.phone && <p id="profile-phone-error" className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-email">{t("account.profile.email")}</Label>
          <Input id="profile-email" type="email" value={customer.email} readOnly aria-describedby="profile-email-note" className="bg-muted" />
          <p id="profile-email-note" className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3.5" aria-hidden="true" />{t("account.profile.emailNote")}</p>
        </div>
      </div>
      {LEGAL_REVIEWED && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("marketing_opt_in")} />
          <span>{rich(t("auth.register.marketing"), legalLinks)}</span>
        </label>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="px-5" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? t("common.loading") : t("account.profile.save")}
      </Button>
    </form>
  );
}

export function ProfileForm({ googleOnly }: { googleOnly: boolean }) {
  const me = useGetMe();
  if (me.isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (me.isError || (me.data && me.data.status !== 200 && me.data.status !== 404)) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">{t("account.loadFailed")}</p>
        <Button variant="outline" onClick={() => void me.refetch()}>{t("common.retry")}</Button>
      </div>
    );
  }
  // Un 404 es un cliente sin perfil todavía: se edita desde vacío.
  const customer: Customer = me.data?.status === 200
    ? me.data.data
    : { email: "", full_name: null, phone: null, marketing_opt_in: false, created_at: new Date().toISOString() };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 sm:p-6"><Form customer={customer} /></section>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-blue-soft text-blue"><KeyRound className="size-5" aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg">{t("account.profile.passwordTitle")}</h2>
            {googleOnly && <p className="text-sm text-muted-foreground">{t("account.profile.googleOnly")}</p>}
          </div>
        </div>
        {!googleOnly && (
          <Link href="/cuenta/contrasena" className={buttonVariants({ variant: "outline", size: "lg", className: "px-4" })}>
            {t("account.profile.changePassword")}
          </Link>
        )}
      </section>
    </div>
  );
}
