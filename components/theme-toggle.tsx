"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
};
const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

// El tema inicial lo fija el script de layout.tsx (preferencia guardada o del sistema).
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11"
      aria-label={next === "dark" ? "Activar modo oscuro" : "Activar modo claro"}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {
          // Sin almacenamiento (modo privado): el cambio vale solo para esta visita.
        }
      }}
    >
      {theme === "dark" ? <Sun className="size-6" /> : <Moon className="size-6" />}
    </Button>
  );
}
