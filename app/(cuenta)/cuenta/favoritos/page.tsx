import type { Metadata } from "next";
import { FavoriteList } from "@/components/cuenta/favorite-list";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("favorites.title"), robots: { index: false } };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <h1 className="text-2xl">{t("favorites.title")}</h1>
      <FavoriteList />
    </div>
  );
}
