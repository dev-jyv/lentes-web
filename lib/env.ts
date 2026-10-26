import { z } from "zod";

const schema = z.object({
  apiUrl: z.string().min(1),
  siteUrl: z.string().min(1),
  imgUrl: z.string(),
  supabaseUrl: z.string(),
  supabaseKey: z.string(),
  sentryDsn: z.string(),
  posthogKey: z.string(),
  posthogHost: z.string(),
  turnstileSiteKey: z.string(),
});

// Cada variable NEXT_PUBLIC_* se lee literal para que Next la inyecte en el bundle.
export const env = schema.parse({
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/v1",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  imgUrl: process.env.NEXT_PUBLIC_IMG_URL ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
});
