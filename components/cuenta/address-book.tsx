"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressForm } from "@/components/cuenta/address-form";
import { deleteAddress, getListAddressesQueryKey, updateAddress, useListAddresses } from "@/lib/api/generated/api";
import type { Address } from "@/lib/api/generated/model";
import { t } from "@/lib/i18n";

const detail = (res: { data?: unknown }) => (res.data as { detail?: string } | undefined)?.detail;

export function AddressBook() {
  const queryClient = useQueryClient();
  const query = useListAddresses();
  // null: cerrado; "new": alta; Address: edición.
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });

  async function makeDefault(a: Address) {
    setBusy(a.id);
    const { id, ...rest } = a;
    const res = await updateAddress(id, { ...rest, is_default: true });
    setBusy(null);
    if (res.status !== 200) toast.error(detail(res) ?? t("account.addresses.updateFailed"));
    await refresh();
  }

  async function remove(a: Address) {
    setBusy(a.id);
    const res = await deleteAddress(a.id);
    setBusy(null);
    setDeleting(null);
    if (res.status === 204) toast.success(t("account.addresses.deleted"));
    else toast.error(detail(res) ?? t("account.addresses.updateFailed"));
    await refresh();
  }

  const items = query.data?.status === 200 ? query.data.data.items : [];
  const addButton = (
    <Button size="lg" className="px-4" onClick={() => setEditing("new")}>
      <Plus aria-hidden="true" />{t("account.addresses.add")}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl lg:text-3xl">{t("account.addresses.title")}</h1>
        {items.length > 0 && addButton}
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
      ) : query.isError || (query.data && query.data.status !== 200) ? (
        <div className="space-y-2 text-sm">
          <p className="text-destructive">{t("account.loadFailed")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>{t("common.retry")}</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-blue-soft text-blue"><MapPin className="size-7" aria-hidden="true" /></span>
          <p>{t("account.addresses.empty")}</p>
          {addButton}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <li key={a.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 data-[default=true]:border-blue/40" data-default={a.is_default}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{a.recipient}</p>
                {a.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-soft px-2.5 py-0.5 text-xs font-semibold text-blue">
                    <Star className="size-3" aria-hidden="true" />{t("account.addresses.default")}
                  </span>
                )}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {a.street} {a.ext_number}{a.int_number ? t("checkout.address.interior", { number: a.int_number }) : ""}, {a.neighborhood}<br />
                {a.city}, {a.state} {a.postal_code}<br />
                {a.phone}
              </p>
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setEditing(a)} aria-label={`${t("account.addresses.edit")}: ${a.recipient}`}>
                  <Pencil aria-hidden="true" />{t("account.addresses.edit")}
                </Button>
                {!a.is_default && (
                  <Button variant="ghost" disabled={busy === a.id} onClick={() => void makeDefault(a)}>
                    {t("account.addresses.makeDefault")}
                  </Button>
                )}
                <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" disabled={busy === a.id}
                  onClick={() => setDeleting(a)} aria-label={`${t("account.addresses.delete")}: ${a.recipient}`}>
                  <Trash2 aria-hidden="true" />{t("account.addresses.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing === "new" ? t("account.addresses.addTitle") : t("account.addresses.editTitle")}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editing !== null && (
              <AddressForm
                key={editing === "new" ? "new" : editing.id}
                idPrefix="book-address"
                address={editing === "new" ? undefined : editing}
                showDefault
                onCancel={() => setEditing(null)}
                onSaved={() => { setEditing(null); toast.success(t("account.addresses.saved")); }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.addresses.deleteTitle", { name: deleting?.recipient ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("account.addresses.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("checkout.address.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={!!busy} onClick={() => deleting && void remove(deleting)}>
              {t("account.addresses.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
