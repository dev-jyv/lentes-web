"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { Dialog } from "@base-ui/react/dialog";
import { CircleCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mergeCart } from "@/lib/api/generated/api";
import { clearCartToken, getCartToken } from "@/lib/cart-token";
import { useTurnstile } from "@/components/turnstile";
import { env } from "@/lib/env";
import { LEGAL_REVIEWED } from "@/lib/legal";
import { passwordStrength } from "@/lib/password-strength";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const email = z.string().email(t("validation.invalidEmail"));
const password = z.string().min(8, t("validation.minPassword"));

// Etiqueta flotante sobre el borde; `--field-bg` la iguala al fondo del contenedor.
export function FloatingField({
  id, label, type = "text", error, autoComplete, reg, className,
}: {
  id: string; label: string; type?: string; error?: string; autoComplete?: string;
  reg: React.ComponentProps<"input">; className?: string;
}) {
  const [shown, setShown] = useState(false);
  const password = type === "password";
  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative">
        <Input id={id} type={password && shown ? "text" : type} autoComplete={autoComplete} aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined} placeholder=" " className={cn("peer h-11 px-3", password && "pr-11")} {...reg} />
        <Label htmlFor={id} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 bg-(--field-bg,var(--background)) px-1 font-normal text-muted-foreground transition-all peer-focus:top-0 peer-focus:text-xs peer-focus:text-foreground peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs">
          {label}
        </Label>
        {password && (
          <button type="button" aria-label={t("auth.showPassword")} aria-pressed={shown} onClick={() => setShown(!shown)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Notice({ error, info }: { error?: string | null; info?: string | null }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (info) return <p role="status" className="text-sm text-muted-foreground">{info}</p>;
  return null;
}

const origin = () => (typeof window === "undefined" ? env.siteUrl : window.location.origin);

// Sin `next`, vuelve a la URL actual (popover del header).
function GoogleButton({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={async () => {
        const { error } = await createClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(
            next ?? safeNext(window.location.pathname + window.location.search),
          )}` },
        });
        if (error) setError(t("auth.googleFailed"));
      }}>
        {t("auth.continueWithGoogle")}
      </Button>
      <Notice error={error} />
    </div>
  );
}

export function LoginForm({ next, onSuccess }: { next?: string; onSuccess?: () => void }) {
  const router = useRouter();
  const id = useId();
  const target = safeNext(next);
  const [error, setError] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ email, password: z.string().min(1, t("validation.required")) })),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async (v) => {
      setError(null);
      if (turnstile.required && !turnstile.token) return setError(t("auth.completeCaptcha"));
      const { error } = await createClient().auth.signInWithPassword({
        ...v, options: { captchaToken: turnstile.token },
      });
      turnstile.reset();
      if (error) return setError(t("auth.wrongCredentials"));
      // Une el carrito anónimo al del cliente; si falla, el carrito anónimo se conserva.
      if (getCartToken() && (await mergeCart()).status === 200) clearCartToken();
      if (onSuccess) onSuccess();
      else router.replace(target);
      router.refresh();
    })}>
      <FloatingField id={`${id}email`} label={t("auth.email")} type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <FloatingField id={`${id}password`} label={t("auth.password")} type="password" autoComplete="current-password"
        error={errors.password?.message} reg={register("password")} />
      <Link href="/recuperar" className="block text-right text-sm underline">{t("auth.forgotPassword")}</Link>
      {turnstile.widget}
      <Notice error={error} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>{t("auth.login.title")}</Button>
      <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t("auth.orContinueWith")}
      </p>
      <GoogleButton next={onSuccess ? undefined : target} />
      <p className="text-center text-sm">
        {rich(t("auth.noAccount"), { link: (c) => (
          <Link href={next ? `/registro?next=${encodeURIComponent(target)}` : "/registro"} className="font-medium underline">{c}</Link>
        ) })}
      </p>
    </form>
  );
}

// Teléfono mexicano opcional: se quitan espacios y guiones antes de exigir 10 dígitos.
const phone = z.string().transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^\d{10}$/.test(v), t("validation.tenDigits"));

const legalLinks = {
  terms: (c: string) => <Link href="/terminos" className="underline">{c}</Link>,
  privacy: (c: string) => <Link href="/privacidad" className="underline">{c}</Link>,
};

function StrengthMeter({ value }: { value: string }) {
  const score = passwordStrength(value);
  if (!score) return null;
  const levels = t("auth.register.strengthLevels", { returnObjects: true });
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-1 flex-1 rounded-full bg-muted",
            n <= score && (score === 1 ? "bg-destructive" : score === 2 ? "bg-warn" : "bg-good"))} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("auth.register.strength", { level: levels[score - 1] })}</p>
    </div>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const id = useId();
  // Destino tras confirmar el correo; sin `next` se conserva el de antes (/cuenta).
  const afterConfirm = safeNext(next);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const turnstile = useTurnstile();
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({
      full_name: z.string().trim().min(2, t("validation.required")),
      email,
      password,
      phone,
      marketing_opt_in: z.boolean(),
    })),
    defaultValues: { full_name: "", email: "", password: "", phone: "", marketing_opt_in: false },
  });
  const pw = useWatch({ control, name: "password" });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("auth.register.socialTitle")}</h2>
      <GoogleButton next={afterConfirm} />
      <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t("auth.register.orEmail")}
      </p>
      <form className="space-y-4" onSubmit={handleSubmit(async ({ full_name, phone, marketing_opt_in, ...v }) => {
        if (done) return;
        setError(null);
        if (turnstile.required && !turnstile.token) return setError(t("auth.completeCaptcha"));
        const { error } = await createClient().auth.signUp({
          ...v,
          options: {
            captchaToken: turnstile.token,
            // lentes-api copia estos datos al crear el cliente y los valida otra vez.
            data: { full_name, phone: phone || null, marketing_opt_in: LEGAL_REVIEWED && marketing_opt_in },
            emailRedirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(afterConfirm)}`,
          },
        });
        turnstile.reset();
        // Sin distinguir "correo ya registrado": no se revela si existe.
        if (error) return setError(t("auth.register.failed"));
        setDone(true);
      })}>
        <p className="text-xs text-muted-foreground">{t("auth.register.requiredNote")}</p>
        <FloatingField id={`${id}name`} label={t("auth.register.fullNameRequired")} autoComplete="name"
          error={errors.full_name?.message} reg={register("full_name")} />
        <FloatingField id={`${id}email`} label={t("auth.register.emailRequired")} type="email" autoComplete="email"
          error={errors.email?.message} reg={register("email")} />
        <div className="space-y-2">
          <FloatingField id={`${id}password`} label={t("auth.register.passwordRequired")} type="password"
            autoComplete="new-password" error={errors.password?.message} reg={register("password")} />
          <StrengthMeter value={pw} />
        </div>
        <div className="ph-no-capture flex items-start gap-2">
          <span className="flex h-11 items-center rounded-lg border border-input px-3 text-sm text-muted-foreground">
            {t("auth.register.phonePrefix")}<span className="sr-only">{t("auth.register.phonePrefixLabel")}</span>
          </span>
          <FloatingField id={`${id}phone`} label={t("auth.register.phone")} type="tel" autoComplete="tel-national"
            className="flex-1" error={errors.phone?.message} reg={{ ...register("phone"), inputMode: "numeric" }} />
        </div>
        {LEGAL_REVIEWED && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("marketing_opt_in")} />
            <span>{rich(t("auth.register.marketing"), legalLinks)}</span>
          </label>
        )}
        {turnstile.widget}
        <Notice error={error} />
        <Button type="submit" className="w-full" disabled={isSubmitting || done}>{t("auth.register.title")}</Button>
        {LEGAL_REVIEWED && (
          <p className="text-xs text-muted-foreground">{rich(t("auth.register.legalNote"), legalLinks)}</p>
        )}
      </form>
      <Dialog.Root open={done} onOpenChange={(open) => {
        // Escape, clic fuera y "Continuar" llevan al mismo destino.
        if (!open) router.replace(safeNext(next, "/"));
      }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-xs" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl bg-popover p-6 text-center text-popover-foreground shadow-lg">
            <CircleCheck className="mx-auto size-12 text-primary" aria-hidden="true" />
            <Dialog.Title className="text-xl font-semibold">{t("auth.register.successTitle")}</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">{t("auth.register.successBody")}</Dialog.Description>
            <Dialog.Close render={<Button className="w-full" />}>{t("auth.register.continue")}</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export function RecoverForm() {
  const [info, setInfo] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ email })),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async ({ email }) => {
      await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${origin()}/auth/callback?next=/cuenta/contrasena`,
      });
      // Respuesta neutra: no revela si el correo existe.
      setInfo(t("auth.recover.sent"));
    })}>
      <FloatingField id="email" label={t("auth.email")} type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <Notice info={info} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>{t("auth.recover.send")}</Button>
    </form>
  );
}

export function NewPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ password })),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async (v) => {
      const { error } = await createClient().auth.updateUser(v);
      if (error) return setError(t("auth.newPassword.failed"));
      router.replace("/cuenta");
    })}>
      <FloatingField id="password" label={t("auth.newPassword.title")} type="password" autoComplete="new-password"
        error={errors.password?.message} reg={register("password")} />
      <Notice error={error} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>{t("common.save")}</Button>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={async () => {
      await createClient().auth.signOut();
      router.replace("/");
      router.refresh();
    }}>
      {t("auth.signOut")}
    </Button>
  );
}
