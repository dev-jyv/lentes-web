import type { Metadata } from "next";
import { AddressBook } from "@/components/cuenta/address-book";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.addresses.title"), robots: { index: false } };

export default function AddressesPage() {
  return <AddressBook />;
}
