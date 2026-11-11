"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mergeCart } from "@/lib/api/generated/api";
import { clearCartToken, getCartToken } from "@/lib/cart-token";
import { useTurnstile } from "@/components/turnstile";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { rich } from "@/lib/rich";

const email = z.string().email(t("validation.invalidEmail"));
const password = z.string().min(8, t("validation.minPassword"));

// Etiqueta flotante sobre el borde; `--field-bg` la iguala al fondo del contenedor.
export function FloatingField({
  id, label, type = "text", error, autoComplete, reg,
}: {
  id: string; label: string; type?: string; error?: string; autoComplete?: string;
  reg: React.ComponentProps<"input">;
}) {
  const [shown, setShown] = useState(false);
  const password = type === "password";
  return (
    <div className="space-y-1">
      <div className="relative">
        <Input id={id} type={password && shown ? "text" : type} autoComplete={autoComplete} aria-invalid={!!error}
          placeholder=" " className={cn("peer h-11 px-3", password && "pr-11")} {...reg} />
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
      {error && <p className="text-xs text-destructive">{error}</p>}
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
        {rich(t("auth.noAccount"), { link: (c) => <Link href="/registro" className="font-medium underline">{c}</Link> })}
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ full_name: z.string().min(2, t("validation.required")), email, password })),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async ({ full_name, ...v }) => {
      setError(null);
      if (turnstile.required && !turnstile.token) return setError(t("auth.completeCaptcha"));
      const { error } = await createClient().auth.signUp({
        ...v,
        options: {
          captchaToken: turnstile.token,
          data: { full_name },
          emailRedirectTo: `${origin()}/auth/callback?next=/cuenta`,
        },
      });
      turnstile.reset();
      if (error) return setError(t("auth.register.failed"));
      setInfo(t("auth.register.checkEmail"));
    })}>
      <FloatingField id="full_name" label={t("auth.register.fullName")} autoComplete="name"
        error={errors.full_name?.message} reg={register("full_name")} />
      <FloatingField id="email" label={t("auth.email")} type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <FloatingField id="password" label={t("auth.password")} type="password" autoComplete="new-password"
        error={errors.password?.message} reg={register("password")} />
      {turnstile.widget}
      <Notice error={error} info={info} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>{t("auth.register.title")}</Button>
      <GoogleButton next="/cuenta" />
      <p className="text-sm">
        {rich(t("auth.register.haveAccount"), { link: (c) => <Link href="/login" className="underline">{c}</Link> })}
      </p>
    </form>
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
