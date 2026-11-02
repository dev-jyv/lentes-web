"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { track } from "@/lib/analytics";
import type { NavItem } from "@/lib/navigation";

const summaryClass =
  "flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md px-2 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden";
const linkClass = "flex min-h-11 items-center rounded-md px-2 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50";

// Grupos con nombre: un acordeón abierto no debe girar la flecha de los que tiene dentro.
function Chevron({ className }: { className: string }) {
  return <ChevronDown className={`size-4 shrink-0 transition-transform ${className}`} aria-hidden="true" />;
}

// Menú lateral para pantallas menores a 1024 px. El Sheet devuelve el foco al botón al cerrarse.
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const go = (menu: string, column: string, value: string) => () => {
    track("nav_click", { menu, column, value });
    setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menú"
        className="grid size-11 place-items-center rounded-full outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
      >
        <Menu className="size-6" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,100vw)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        <nav aria-label="Menú móvil" className="space-y-1 px-4 pb-6 text-sm font-medium">
          {items.map((item) => (
            <details key={item.href} className="group/item">
              <summary className={`${summaryClass} text-base font-semibold`}>
                {item.label} <Chevron className="group-open/item:rotate-180" />
              </summary>
              <div className="space-y-1 pb-2 pl-2">
                <Link href={item.href} onClick={go(item.label, "todos", item.label)} className={`${linkClass} text-primary`}>
                  {item.allLabel}
                </Link>
                {item.columns.map((column) => (
                  <details key={column.title} className="group/column">
                    <summary className={summaryClass}>
                      {column.title} <Chevron className="group-open/column:rotate-180" />
                    </summary>
                    <ul className="pl-2 font-normal">
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} onClick={go(item.label, column.title, link.label)} className={linkClass}>
                            <span className="truncate">{link.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          ))}
          <hr className="my-2" />
          <Link href="/cuenta/recetas" onClick={go("cuenta", "cuenta", "Mi receta")} className={linkClass}>Mi receta</Link>
          <Link href="/cuenta" onClick={go("cuenta", "cuenta", "Mi cuenta")} className={linkClass}>Mi cuenta</Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
