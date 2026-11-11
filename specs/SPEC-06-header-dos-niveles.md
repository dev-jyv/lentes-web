# SPEC 06 — Header de dos niveles

> **Status:** Implemented — feature/header-dos-niveles
> **Depends on:** SPEC 03
> **Date:** 2026-11-11
> **Objective:** Reorganizar el header de `lentes-web` en dos filas, con buscador ancho e iconos de cuenta, favoritos y carrito arriba y la barra de categorías centrada abajo.

## Context

El header de SPEC 03 mete logo, megamenú, buscador angosto, "Mi receta", carrito, cuenta y tema en una sola fila de 64 px. En escritorio el buscador queda de 320 px y los enlaces compiten con los iconos. EyeBuyDirect resuelve lo mismo con dos filas: arriba logo, buscador ancho e iconos; abajo una barra gris con las categorías centradas. Este spec cambia solo la estructura del header; el buscador, el login, los favoritos y el registro tienen sus propios specs (07 a 10). La referencia visual para estas piezas pasa de GlassesUSA a EyeBuyDirect; el home, el carrusel y la franja de confianza siguen con GlassesUSA.

## Goals

- En escritorio (≥ 1024 px) el header tiene dos filas: fila de marca (logo, buscador, acciones) y barra de categorías.
- El buscador ocupa el espacio central de la fila de marca, con un ancho mínimo de 480 px en 1280 px.
- La barra de categorías muestra los mismos `NavItem` de `buildNavigation` y abre el megamenú actual al pasar el cursor o con teclado.
- La fila de acciones queda en este orden: "Iniciar sesión ▾" (o el nombre del cliente), favoritos, carrito.
- En móvil el header conserva el menú lateral de SPEC 03, con el buscador debajo del logo.
- Se conserva la paleta y la tipografía propias; no se copia el dorado ni el logo de EyeBuyDirect.

## Non-goals

- Icono de ayuda (?): se omite porque no existe una página de ayuda.
- Enlace "Usa tu seguro" o cualquier copy de seguros, entrega en 2 días o descuentos de la barra promocional de EyeBuyDirect.
- Etiquetas "Nuevo" o categorías en rojo tipo "Holiday Deals" en la barra de categorías.
- Cambiar el contenido del megamenú (columnas y tarjetas): sigue saliendo de `lib/navigation.ts`.
- Cambiar la barra promocional (`PromoBar`): sigue administrada desde lentes-admin.
- El comportamiento del dropdown del buscador (SPEC 07), del popover de login (SPEC 08) y de favoritos (SPEC 09).

## Dependencies

- SPEC 03: `buildNavigation`, `MegaMenu`, `MobileMenu`, `SearchForm` y `PromoBar`.
- SPEC 08 y SPEC 09 llenan los espacios de cuenta y favoritos. Hasta que se implementen, la cuenta enlaza a `/cuenta` y el icono de favoritos no se muestra.

## Functional requirements

1. `SiteHeader` renderiza en escritorio una fila de marca de 72–80 px: logo a la izquierda, `SearchForm` en el centro con `flex-1`, acciones a la derecha.
2. Debajo, una barra de categorías de fondo `muted` a todo el ancho, con los `NavItem` centrados en una fila.
3. Cada categoría de la barra abre el panel del megamenú existente a todo el ancho, debajo de la barra.
4. El enlace "Mi receta" sale de la fila de acciones y pasa al menú de cuenta (SPEC 08) y al menú lateral móvil.
5. El selector de tema (`ThemeToggle`) sale del header de escritorio y pasa al pie del sitio; en móvil queda en el menú lateral.
6. La acción de cuenta muestra "Iniciar sesión" con un chevron sin sesión, y el primer nombre del cliente con sesión.
7. El carrito conserva `CartLink` con su contador.
8. El header sigue siendo `sticky`; al hacer scroll se oculta la barra de categorías y queda solo la fila de marca.
9. En móvil (< 1024 px): fila con menú, logo, cuenta y carrito; debajo el buscador a todo el ancho; sin barra de categorías.
10. Todos los textos nuevos viven en `messages/es-MX.json`.

## Interfaces & contracts

N/A — cambio de presentación dentro de `components/tienda/site-header.tsx`, `mega-menu.tsx` y `site-footer.tsx`; no expone ni consume contratos nuevos de API.

## Edge cases

- API caída (`loadFacets` devuelve `null`): la barra de categorías muestra los `NavItem` sin columnas de facetas, como hoy.
- Nombre del cliente muy largo o ausente: se trunca a 16 caracteres; sin nombre se muestra "Mi cuenta".
- Ventana entre 1024 y 1180 px: los items de la barra reducen su espacio; nunca hay scroll horizontal.
- Teclado: Tab recorre logo, buscador, acciones y luego la barra; Escape cierra el megamenú y devuelve el foco a su categoría.
- `prefers-reduced-motion`: el header no anima al ocultar la barra.

## Acceptance criteria

- [ ] Dado un escritorio de 1280 px, cuando cargo cualquier página, veo dos filas: logo, buscador ancho y acciones arriba, y categorías centradas abajo.
- [ ] Dado el header de escritorio, cuando paso el cursor o enfoco "Armazones", se abre el megamenú con sus columnas y tarjetas.
- [ ] Dado que no tengo sesión, la acción de cuenta dice "Iniciar sesión ▾"; con sesión muestra mi primer nombre.
- [ ] Dado que hago scroll hacia abajo, la barra de categorías se oculta y la fila de marca sigue visible.
- [ ] Dado un móvil de 375 px, veo menú, logo, cuenta y carrito, y el buscador debajo, sin scroll horizontal.
- [ ] "Mi receta" y el selector de tema siguen alcanzables (menú de cuenta, menú lateral o pie).
- [ ] Ningún texto del header está hardcodeado fuera de `messages/es-MX.json`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.

## Risks

- Ocultar la barra al hacer scroll puede chocar con el `sticky` del resumen del checkout (`lg:top-28`); hay que ajustar ese offset.
- Quitar "Mi receta" del primer nivel puede bajar el uso de la recompra; se mide con PostHog (`nav_click`) tras el cambio.
- CLAUDE.md y la memoria del proyecto citan solo a GlassesUSA; hay que actualizarlos al implementar para no mezclar referencias.
