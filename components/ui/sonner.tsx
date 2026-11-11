"use client";

import { CircleCheckIcon, CircleXIcon, Loader2Icon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Toaster de sonner con los tokens de la marca. Los colores salen de variables CSS, así que siguen
// al tema activo (`data-theme` en <html>) sin depender de next-themes.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      icons={{
        success: <CircleCheckIcon className="size-4 text-primary" />,
        error: <CircleXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "font-sans" } }}
      {...props}
    />
  );
}
