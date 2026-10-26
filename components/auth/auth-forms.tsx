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
import { mergeCart } from "@/lib/api/generated/cart/cart";
import { clearCartToken, getCartToken } from "@/lib/cart-token";
import { useTurnstile } from "@/components/turnstile";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

const email = z.string().email("Correo no válido");
const password = z.string().min(8, "Mínimo 8 caracteres");

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
        if (error) setError("No se pudo iniciar con Google.");
      }}>
        Continuar con Google
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
    resolver: zodResolver(z.object({ email, password: z.string().min(1, "Requerido") })),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async (v) => {
      setError(null);
      if (turnstile.required && !turnstile.token) return setError("Completa la verificación.");
      const { error } = await createClient().auth.signInWithPassword({
        ...v, options: { captchaToken: turnstile.token },
      });
      turnstile.reset();
      if (error) return setError("Correo o contraseña incorrectos.");
      // Une el carrito anónimo al del cliente; si falla, el carrito anónimo se conserva.
      if (getCartToken() && (await mergeCart()).status === 200) clearCartToken();
      router.replace(target);
      router.refresh();
    })}>
      <Row id="email" label="Correo" type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <Row id="password" label="Contraseña" type="password" autoComplete="current-password"
        error={errors.password?.message} reg={register("password")} />
      {turnstile.widget}
      <Notice error={error} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>Iniciar sesión</Button>
      <GoogleButton next={target} />
      <div className="flex justify-between text-sm">
        <Link href="/recuperar" className="underline">Olvidé mi contraseña</Link>
        <Link href="/registro" className="underline">Crear cuenta</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ full_name: z.string().min(2, "Requerido"), email, password })),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(async ({ full_name, ...v }) => {
      setError(null);
      if (turnstile.required && !turnstile.token) return setError("Completa la verificación.");
      const { error } = await createClient().auth.signUp({
        ...v,
        options: {
          captchaToken: turnstile.token,
          data: { full_name },
          emailRedirectTo: `${origin()}/auth/callback?next=/cuenta`,
        },
      });
      turnstile.reset();
      if (error) return setError("No se pudo crear la cuenta. Intenta de nuevo.");
      setInfo("Revisa tu correo para confirmar tu cuenta.");
    })}>
      <Row id="full_name" label="Nombre completo" autoComplete="name"
        error={errors.full_name?.message} reg={register("full_name")} />
      <Row id="email" label="Correo" type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <Row id="password" label="Contraseña" type="password" autoComplete="new-password"
        error={errors.password?.message} reg={register("password")} />
      {turnstile.widget}
      <Notice error={error} info={info} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>Crear cuenta</Button>
      <GoogleButton next="/cuenta" />
      <p className="text-sm">
        ¿Ya tienes cuenta? <Link href="/login" className="underline">Inicia sesión</Link>
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
      setInfo("Si el correo existe, te enviamos un enlace para restablecer tu contraseña.");
    })}>
      <Row id="email" label="Correo" type="email" autoComplete="email"
        error={errors.email?.message} reg={register("email")} />
      <Notice info={info} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>Enviar enlace</Button>
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
      if (error) return setError("No se pudo actualizar la contraseña.");
      router.replace("/cuenta");
    })}>
      <Row id="password" label="Nueva contraseña" type="password" autoComplete="new-password"
        error={errors.password?.message} reg={register("password")} />
      <Notice error={error} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>Guardar</Button>
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
      Cerrar sesión
    </Button>
  );
}
