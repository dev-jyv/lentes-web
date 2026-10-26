import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { env } from "@/lib/env";

// Todo opcional: sin DSN/clave no se inicializa (desarrollo local).
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    tracesSampleRate: 0.1,
  });
}

if (env.posthogKey) {
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    capture_pageview: "history_change",
    respect_dnt: true,
    // Receta y direcciones son datos personales/de salud: nunca se graban.
    // Además, las secciones sensibles llevan la clase `ph-no-capture`.
    session_recording: { maskAllInputs: true },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
