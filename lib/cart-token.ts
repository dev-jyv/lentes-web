// Token del carrito anónimo. Lo emite el backend (header X-Cart-Token) y vive
// en una cookie legible por JS: solo identifica un carrito, no da acceso a datos personales.
const NAME = "cart_token";
const MAX_AGE = 60 * 60 * 24 * 30;

export function getCartToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${NAME}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function setCartToken(token: string) {
  document.cookie = `${NAME}=${encodeURIComponent(token)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
}

export function clearCartToken() {
  document.cookie = `${NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}
