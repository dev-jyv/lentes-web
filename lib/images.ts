import { env } from "@/lib/env";

// La API devuelve rutas relativas (/products/x/1.jpg) o URLs absolutas; las relativas
// cuelgan del dominio público de imágenes (R2 detrás de img.tutienda.com).
export function imageSrc(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return env.imgUrl ? `${env.imgUrl}${url.startsWith("/") ? "" : "/"}${url}` : null;
}
