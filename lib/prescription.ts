import type { RxStatus } from "@/lib/api/generated/model";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

export const rxStatusLabel: Record<RxStatus, string> = {
  pending: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export const isExpired = (expiresAt: string) => expiresAt < new Date().toISOString().slice(0, 10);

// Una receta sirve para comprar si no está rechazada ni vencida.
export const isUsable = (r: { status: RxStatus; expires_at: string }) =>
  r.status !== "rejected" && !isExpired(r.expires_at);
