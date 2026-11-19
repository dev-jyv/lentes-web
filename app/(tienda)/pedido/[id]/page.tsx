import type { Metadata } from "next";
import { GuestOrder } from "@/components/tienda/guest-order";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("guestOrder.metaTitle"), robots: { index: false }, referrer: "no-referrer" };

// Pedido de invitado con su enlace privado (SPEC 25). El token llega en ?t= desde el correo o la vuelta de Mercado Pago.
export default async function GuestOrderPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t: token }] = await Promise.all([params, searchParams]);
  return (
    <div className="ph-no-capture container-page py-8 lg:py-12">
      <GuestOrder id={id} token={token ?? ""} />
    </div>
  );
}
