"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import Image from "next/image";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { NavItem } from "@/lib/navigation";
import { t } from "@/lib/i18n";

// Megamenú de escritorio. Hover con intención de 150 ms, clic o teclado; el cierre también espera 150 ms
// para no cerrarse al mover el cursor en diagonal hacia el panel. El panel ocupa todo el ancho bajo la cabecera.
const headerElement = () => document.getElementById("site-header");

export function MegaMenu({ items }: { items: NavItem[] }) {
  return (
    <NavigationMenu.Root delay={150} closeDelay={150} className="hidden lg:block">
      <NavigationMenu.List aria-label={t("nav.categoriesLabel")} className="flex items-center text-base font-medium">
        {items.map((item) => (
          <NavigationMenu.Item key={item.href} value={item.href}>
            <NavigationMenu.Trigger className="relative flex h-16 items-center px-3 whitespace-nowrap outline-none after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-foreground after:transition-transform text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground data-popup-open:after:scale-x-100">
              {item.label}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <Panel item={item} />
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        {/* Bajo la cabecera (z-40): oscurece y desenfoca solo el contenido de la página. */}
        <NavigationMenu.Backdrop className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <NavigationMenu.Positioner anchor={headerElement} sideOffset={0} collisionPadding={0} className="z-50">
          <NavigationMenu.Popup className="overflow-hidden bg-popover text-popover-foreground shadow-lg transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

const linkClass =
  "block truncate rounded-md outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

function Panel({ item }: { item: NavItem }) {
  const onClick = (column: string, value: string) => () => track("nav_click", { menu: item.label, column, value });
  // Sin datos (API caída) el panel conserva una columna para no perder el enlace a toda la categoría.
  const columns = item.columns.length ? item.columns : [{ title: item.label, links: [] }];
  return (
    <div className="w-(--anchor-width)">
      <div className="container-page flex items-start gap-8 pt-10 pb-12">
        <div className="grid min-w-0 flex-1 auto-cols-fr grid-flow-col gap-6">
          {columns.map((column, index) => (
            <div key={column.title} className="min-w-0">
              <h3 className="mb-3 text-lg font-bold">{column.title}</h3>
              <ul className={columns.length === 1 ? "columns-4" : undefined}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <NavigationMenu.Link
                      render={<Link href={link.href} onClick={onClick(column.title, link.label)} title={link.label} />}
                      className={`${linkClass} py-1.5`}
                    >
                      {link.label}
                    </NavigationMenu.Link>
                  </li>
                ))}
                {index === 0 && (
                  <li>
                    <NavigationMenu.Link
                      render={<Link href={item.href} onClick={onClick("todos", item.label)} />}
                      className={`${linkClass} py-1.5 font-semibold whitespace-normal`}
                    >
                      {item.allLabel}
                    </NavigationMenu.Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
        {!!item.cards?.length && (
          <ul className="hidden shrink-0 grid-cols-2 gap-3 min-[1200px]:grid">
            {item.cards.map((card) => (
              <li key={card.href}>
                <NavigationMenu.Link
                  render={<Link href={card.href} onClick={onClick("tarjetas", card.label)} />}
                  className="group relative flex h-56 w-40 items-end justify-center overflow-hidden rounded-2xl bg-muted p-3 shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Image src={card.image} alt="" fill sizes="160px" className="object-cover" />
                  <span className="relative rounded-full bg-white px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-band shadow-sm group-hover:underline">
                    {card.label}
                  </span>
                </NavigationMenu.Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
