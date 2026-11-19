import type { AddressInput, GuestContact } from "@/lib/api/generated/model";

// Borrador del checkout de invitado (SPEC 25): vive en sessionStorage mientras dura la pestaña, para que un recargo o el
// regreso desde Mercado Pago no obliguen a escribir de nuevo. La receta nunca se guarda aquí.
export type GuestDraft = {
  contact?: Required<GuestContact>;
  address?: Omit<AddressInput, "is_default">;
  order?: { id: string; token: string };
};

const KEY = "guest-checkout";

// sessionStorage puede no existir o lanzar (navegación privada estricta): el flujo sigue, solo sin recordar.
export function readGuestDraft(): GuestDraft {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as GuestDraft;
  } catch {
    return {};
  }
}

export function writeGuestDraft(patch: GuestDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readGuestDraft(), ...patch }));
  } catch {
    // sin almacenamiento
  }
}

export function clearGuestDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // sin almacenamiento
  }
}
