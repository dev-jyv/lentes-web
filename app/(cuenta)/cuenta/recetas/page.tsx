import type { Metadata } from "next";
import { PrescriptionForm } from "@/components/cuenta/prescription-form";
import { PrescriptionList } from "@/components/cuenta/prescription-list";

export const metadata: Metadata = { title: "Mis recetas", robots: { index: false } };

export default function PrescriptionsPage() {
  return (
    <div className="ph-no-capture mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="text-2xl font-bold">Mis recetas</h1>
      <PrescriptionList />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Subir una receta</h2>
        <PrescriptionForm />
      </section>
    </div>
  );
}
