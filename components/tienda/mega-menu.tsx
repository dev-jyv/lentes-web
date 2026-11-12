"use client";

import { NavigationMenu } from "@base-ui/react/navigation-menu";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import type { NavItem } from "@/lib/navigation";
import { t } from "@/lib/i18n";

// Megamenú de escritorio. Hover con intención de 150 ms, clic o teclado; el cierre también espera 150 ms
// para no cerrarse al mover el cursor en diagonal hacia el panel. El panel ocupa todo el ancho bajo la barra.
const barElement = () => document.getElementById("barra-categorias");

// Barra de categorías pegada bajo la fila de marca. Al bajar se desliza detrás de ella con transform,
// sin cambiar la altura de la página (eso movería el scroll y volvería a mostrarla).
export function MegaMenu({ items }: { items: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setCollapsed(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <NavigationMenu.Root
      delay={150}
      closeDelay={150}
      id="barra-categorias"
      data-collapsed={collapsed || undefined}
      className="sticky top-18 z-35 hidden border-b bg-muted transition-transform duration-200 motion-reduce:transition-none data-collapsed:not-focus-within:-translate-y-full lg:block"
    >
      <NavigationMenu.List aria-label={t("nav.categoriesLabel")} className="container-page flex items-center justify-center text-base font-medium">
        {items.map((item) => (
          <NavigationMenu.Item key={item.href} value={item.href}>
            <NavigationMenu.Trigger className="relative flex h-12 items-center px-2 whitespace-nowrap outline-none after:absolute after:inset-x-2 xl:px-4 xl:after:inset-x-4 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-foreground after:transition-transform text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground data-popup-open:after:scale-x-100">
              {item.label}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <Panel item={item} />
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
      <NavigationMenu.Portal>
        {/* Bajo la cabecera (z-40) y la barra (z-35): oscurece y desenfoca solo el contenido de la página. */}
        <NavigationMenu.Backdrop className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <NavigationMenu.Positioner anchor={barElement} sideOffset={0} collisionPadding={0} className="z-50">
          <NavigationMenu.Popup className="overflow-hidden bg-popover text-popover-foreground shadow-lg transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

// Zona de tarjetas (SPEC 15): hasta 4. Entre lg y xl van 2 por fila para no bajar de un ancho legible;
// desde xl, todas en una fila. Las tarjetas tienen ancho fijo: con menos de 4 no se estiran.
const CARD_COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-2 xl:grid-cols-3", "grid-cols-2 xl:grid-cols-4"];

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
          <ul className={`grid shrink-0 gap-3 ${CARD_COLS[item.cards.length]}`}>
            {item.cards.map((card) => (
              <li key={`${card.href}-${card.label}`}>
                <NavigationMenu.Link
                  render={<Link href={card.href} onClick={onClick("tarjetas", card.label)} title={card.label} />}
                  className="group relative flex h-44 w-32 items-end justify-center overflow-hidden rounded-2xl bg-muted p-3 shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 2xl:h-56 2xl:w-40"
                >
                  <Image src={card.image} alt={card.alt} fill unoptimized sizes="160px" className="object-cover" />
                  <span className="relative max-w-full truncate rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-band shadow-sm group-hover:underline">
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
