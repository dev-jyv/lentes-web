"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const s = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("turnstile")));
    if (!existing) document.head.appendChild(s);
  });
}

// Reto invisible. El token se valida en Go (o en Supabase, para login/registro).
// Sin site key (desarrollo) no se renderiza y `required` es false.
export function useTurnstile() {
  const [token, setToken] = useState<string | undefined>();
  const widgetId = useRef<string | undefined>(undefined);
  const required = !!env.turnstileSiteKey;

  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el || !required) return;
    loadScript().then(() => {
      if (!window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(el, {
        sitekey: env.turnstileSiteKey,
        size: "flexible",
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(undefined),
        "error-callback": () => setToken(undefined),
      });
    }).catch(() => setToken(undefined));
  }, [required]);

  useEffect(() => () => {
    if (widgetId.current) window.turnstile?.remove(widgetId.current);
  }, []);

  // Los tokens son de un solo uso: reiniciar tras cada intento.
  const reset = useCallback(() => {
    setToken(undefined);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return { token, required, reset, widget: required ? <div ref={ref} className="min-h-[65px]" /> : null };
}
