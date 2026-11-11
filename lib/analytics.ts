import posthog from "posthog-js";

type Props = Record<string, string | number | boolean | null | undefined>;

// Eventos del embudo. `order_paid` lo envía el backend en Go, no el navegador.
// `add_to_cart` de lentes de contacto lleva las cajas de cada ojo en `boxes_od` y `boxes_os`.
type AnalyticsEvent = "product_viewed" | "add_to_cart" | "checkout_started" | "nav_click" | "search_submitted"
  | "favorite_added" | "favorite_removed";

export function track(event: AnalyticsEvent, props?: Props) {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.capture(event, props);
}
