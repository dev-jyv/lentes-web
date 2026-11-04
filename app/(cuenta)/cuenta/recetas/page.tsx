import type { Metadata } from "next";
import { PrescriptionForm } from "@/components/cuenta/prescription-form";
import { PrescriptionList } from "@/components/cuenta/prescription-list";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.prescriptions"), robots: { index: false } };

export default function PrescriptionsPage() {
  return (
    <div className="ph-no-capture mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="text-2xl">{t("account.prescriptions")}</h1>
      <PrescriptionList />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("account.uploadPrescription")}</h2>
        <PrescriptionForm />
      </section>
    </div>
  );
}
