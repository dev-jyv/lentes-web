import { z } from "zod";

const schema = z.object({
  apiUrl: z.string().min(1),
  siteUrl: z.string().min(1),
  imgUrl: z.string(),
  supabaseUrl: z.string(),
  supabaseKey: z.string(),
});

// Cada variable NEXT_PUBLIC_* se lee literal para que Next la inyecte en el bundle.
export const env = schema.parse({
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/v1",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  imgUrl: process.env.NEXT_PUBLIC_IMG_URL ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
});
