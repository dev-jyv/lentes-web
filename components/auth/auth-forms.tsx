"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

function Row({
  id, label, type = "text", error, autoComplete, reg,
}: {
  id: string; label: string; type?: string; error?: string; autoComplete?: string;
  reg: React.ComponentProps<"input">;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} autoComplete={autoComplete} aria-invalid={!!error} {...reg} />
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

export function GoogleButton({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={async () => {
        const { error } = await createClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) setError(t("auth.googleFailed"));
      }}>
        {t("auth.continueWithGoogle")}
      </Button>
      <Notice error={error} />
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
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
      router.replace(target);
      router.refresh();
    })}>
      <Row id="email" label={t("auth.email")} type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <Row id="password" label={t("auth.password")} type="password" autoComplete="current-password"
        error={errors.password?.message} reg={register("password")} />
      {turnstile.widget}
      <Notice error={error} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>{t("auth.login.title")}</Button>
      <GoogleButton next={target} />
      <div className="flex justify-between text-sm">
        <Link href="/recuperar" className="underline">{t("auth.forgotPassword")}</Link>
        <Link href="/registro" className="underline">{t("auth.register.title")}</Link>
      </div>
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
      <Row id="full_name" label={t("auth.register.fullName")} autoComplete="name"
        error={errors.full_name?.message} reg={register("full_name")} />
      <Row id="email" label={t("auth.email")} type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <Row id="password" label={t("auth.password")} type="password" autoComplete="new-password"
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
      <Row id="email" label={t("auth.email")} type="email" autoComplete="email"
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
      <Row id="password" label={t("auth.newPassword.title")} type="password" autoComplete="new-password"
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
