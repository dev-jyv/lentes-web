import type { Metadata } from "next";
import { Reorder } from "@/components/tienda/reorder";

export const metadata: Metadata = { title: "Recompra", robots: { index: false } };

export default async function ReorderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="ph-no-capture mx-auto max-w-2xl px-4 py-10">
      <Reorder orderId={orderId} />
    </div>
  );
}
