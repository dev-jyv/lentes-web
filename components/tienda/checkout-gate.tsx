"use client";

import { ArrowLeft, UserRound, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CheckoutForm, CheckoutSkeleton } from "@/components/tienda/checkout-form";
import { GuestCheckout } from "@/components/tienda/guest-checkout";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { clearGuestDraft, readGuestDraft } from "@/lib/guest-checkout";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

const LoginForm = dynamic(() => import("@/components/auth/auth-forms").then((m) => m.LoginForm), { ssr: false });

type Session = "loading" | "user" | "anon";
type Mode = "choose" | "guest" | "login";

// /checkout es público (SPEC 25): con sesión, el checkout de la cuenta; sin sesión, comprar como invitado o entrar.
// La sesión se lee en el navegador; al iniciar sesión aquí mismo, el carrito anónimo se une (Providers) y cambia la vista.
export function CheckoutGate() {
  const [session, setSession] = useState<Session>(env.supabaseUrl ? "loading" : "anon");
  // Quien ya empezó como invitado en esta pestaña vuelve directo a sus pasos.
  const [mode, setMode] = useState<Mode>(() => (typeof window !== "undefined" && readGuestDraft().contact ? "guest" : "choose"));

  useEffect(() => {
    if (!env.supabaseUrl) return;
    const { data } = createClient().auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN") clearGuestDraft();
      setSession(s?.user ? "user" : "anon");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === "loading") return <CheckoutSkeleton />;
  if (session === "user") return <CheckoutForm />;
  if (mode === "guest") return <GuestCheckout onLogin={() => setMode("login")} />;

  return (
    <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
      <section aria-labelledby="checkout-guest" className="flex flex-col gap-4 rounded-2xl border border-blue/40 bg-card p-6 shadow-sm">
        <span className="grid size-11 place-items-center rounded-full bg-blue-soft text-blue"><Zap className="size-5" aria-hidden="true" /></span>
        <div className="space-y-1">
          <h2 id="checkout-guest" className="text-xl">{t("checkout.guest.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("checkout.guest.body")}</p>
        </div>
        <Button size="lg" className="mt-auto h-12 w-full text-base" onClick={() => setMode("guest")}>{t("checkout.guest.cta")}</Button>
      </section>

      <section aria-labelledby="checkout-login" className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
        <span className="grid size-11 place-items-center rounded-full bg-secondary"><UserRound className="size-5" aria-hidden="true" /></span>
        <div className="space-y-1">
          <h2 id="checkout-login" className="text-xl">{t("checkout.guest.loginTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("checkout.guest.loginBody")}</p>
        </div>
        {mode === "login" ? (
          // Al entrar, onAuthStateChange cambia la vista; no se navega.
          <LoginForm next="/checkout" onSuccess={() => {}} />
        ) : (
          <Button variant="outline" size="lg" className="mt-auto h-12 w-full text-base" onClick={() => setMode("login")}>{t("checkout.guest.loginCta")}</Button>
        )}
      </section>

      {mode === "login" && readGuestDraft().contact && (
        <Button variant="ghost" className="justify-self-start md:col-span-2" onClick={() => setMode("guest")}>
          <ArrowLeft aria-hidden="true" />{t("checkout.guest.backToGuest")}
        </Button>
      )}
    </div>
  );
}
