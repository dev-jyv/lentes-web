"use client";

import type { User } from "@supabase/supabase-js";
import { ChevronDown, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

// La sesión se lee en el navegador para no volver dinámicas las páginas del catálogo.
export function AccountLink() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!env.supabaseUrl) return;
    const { data } = createClient().auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const first = String(user?.user_metadata?.full_name ?? "").trim().split(/\s+/)[0].slice(0, 16);
  return (
    <Link
      href={user ? "/cuenta" : "/login"}
      className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent lg:px-3"
    >
      <UserRound className="size-6" aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">{user ? first || t("account.title") : t("nav.signIn")}</span>
      {!user && <ChevronDown className="hidden size-4 lg:block" aria-hidden="true" />}
    </Link>
  );
}
