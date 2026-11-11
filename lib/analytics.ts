import posthog from "posthog-js";

type Props = Record<string, string | number | boolean | null | undefined>;

// Eventos del embudo. `order_paid` lo envía el backend en Go, no el navegador.
type AnalyticsEvent = "product_viewed" | "add_to_cart" | "checkout_started" | "nav_click" | "search_submitted";

export function track(event: AnalyticsEvent, props?: Props) {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.capture(event, props);
}
