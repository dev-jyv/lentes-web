"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { NavItem } from "@/lib/navigation";

// Megamenú de escritorio. Hover con intención de 150 ms, clic o teclado; el cierre también espera 150 ms
// para no cerrarse al mover el cursor en diagonal hacia el panel.
export function MegaMenu({ items }: { items: NavItem[] }) {
  return (
    <NavigationMenu.Root delay={150} closeDelay={150} className="hidden lg:block">
      <NavigationMenu.List aria-label="Categorías" className="flex items-center gap-1 text-sm font-medium">
        {items.map((item) => (
          <NavigationMenu.Item key={item.href} value={item.href}>
            <NavigationMenu.Trigger className="group flex h-11 items-center gap-1 rounded-full px-4 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-accent">
              {item.label}
              <ChevronDown className="size-4 transition-transform group-data-popup-open:rotate-180" aria-hidden="true" />
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <Panel item={item} />
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        <NavigationMenu.Positioner sideOffset={8} collisionPadding={16} className="z-50">
          <NavigationMenu.Popup className="overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

function Panel({ item }: { item: NavItem }) {
  const onClick = (column: string, value: string) => () => track("nav_click", { menu: item.label, column, value });
  return (
    <div className="w-[min(60rem,calc(100vw-2rem))] p-6">
      <div className="grid auto-cols-fr grid-flow-col gap-6">
        {item.columns.map((column) => (
          <div key={column.title} className="min-w-0">
            <h3 className="optic mb-2 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
              {column.title}
            </h3>
            <ul className={column.links.length > 10 ? "columns-3 text-sm" : "text-sm"}>
              {column.links.map((link) => (
                <li key={link.href}>
                  <NavigationMenu.Link
                    render={<Link href={link.href} onClick={onClick(column.title, link.label)} title={link.label} />}
                    className="block truncate rounded-md py-1.5 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {link.label}
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t pt-4">
        <NavigationMenu.Link
          render={<Link href={item.href} onClick={onClick("todos", item.label)} />}
          className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {item.allLabel} <ArrowRight className="size-4" aria-hidden="true" />
        </NavigationMenu.Link>
      </div>
    </div>
  );
}
