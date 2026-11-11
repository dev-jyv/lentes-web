"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginForm, RegisterForm } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";
import { safeNext } from "@/lib/safe-next";

type Tab = "login" | "register";

const tabClass = "-mb-px flex-1 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:border-primary data-active:text-foreground";

// /login y /registro son la misma página: la URL decide la pestaña y cambiar de pestaña cambia la URL.
export function AuthTabs({ initial, next }: { initial: Tab; next?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initial);
  // Un `next` inválido se descarta al cambiar de pestaña.
  const query = next && safeNext(next, "") ? `?next=${encodeURIComponent(next).replaceAll("%2F", "/")}` : "";

  return (
    <Tabs.Root value={tab} onValueChange={(value: Tab) => {
      setTab(value);
      router.replace(`${value === "login" ? "/login" : "/registro"}${query}`, { scroll: false });
    }}>
      <Tabs.List aria-label={t("auth.tabs.label")} className="mb-6 flex border-b border-border">
        <Tabs.Tab value="login" className={tabClass}>{t("auth.tabs.login")}</Tabs.Tab>
        <Tabs.Tab value="register" className={tabClass}>{t("auth.tabs.register")}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="login" className="outline-none"><LoginForm next={next} /></Tabs.Panel>
      <Tabs.Panel value="register" className="outline-none"><RegisterForm next={next} /></Tabs.Panel>
    </Tabs.Root>
  );
}
