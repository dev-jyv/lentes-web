import type { Metadata } from "next";
import { PrescriptionReview } from "@/components/admin/prescription-review";

export const metadata: Metadata = { title: "Admin · Recetas", robots: { index: false } };

export default function AdminPrescriptionsPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Recetas por revisar</h1>
      <PrescriptionReview />
    </>
  );
}
