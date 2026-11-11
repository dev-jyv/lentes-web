# SPEC 11 — Menú de cuenta en panel lateral

> **Status:** Approved
> **Depends on:** SPEC 08
> **Date:** 2026-11-11
> **Objective:** Reemplazar el menú desplegable de cuenta del header por un panel lateral derecho que saluda al cliente y lista sus secciones con iconos.

## Context

SPEC 08 dejó, para clientes con sesión, un menú desplegable pequeño bajo el nombre (Mi cuenta, Mis pedidos, Mis recetas, Cerrar sesión). En celular el control solo enlaza a `/cuenta`. La referencia muestra un panel que entra desde la derecha a todo el alto, con "Hola de nuevo, {nombre}", un botón de cerrar y una lista de secciones con icono y separadores. El mismo panel sirve en escritorio y celular.

## Goals

- Con sesión, el control de cuenta abre un panel lateral derecho en todos los anchos de pantalla.
- El panel muestra el saludo con el nombre del cliente y cuatro entradas con icono: Mi cuenta, Mis pedidos, Mis recetas y Cerrar sesión.
- Sin sesión, el comportamiento de SPEC 08 no cambia (popover en escritorio, `/login` en celular).

## Non-goals

- "Devoluciones" o cualquier entrada a un flujo que no existe (decisión del usuario: se omite).
- Favoritos en el panel: llegan con SPEC 09.
- Mostrar pedidos recientes, recetas o puntos dentro del panel.
- Cambiar las páginas de `/cuenta`.

## Dependencies

- SPEC 08: `components/tienda/account-link.tsx`, lectura de sesión en el cliente y `signOut()`.
- `components/ui/sheet.tsx` (shadcn sobre `@base-ui/react` Dialog), ya usado por `MobileMenu`.

## Functional requirements

1. Con sesión, al activar el control de cuenta se abre un `Sheet` con `side="right"`, ancho de 400 px en escritorio y 100 % en celular (< 600 px).
2. Encabezado: "Hola de nuevo, {{name}}" con el nombre de `user_metadata.full_name` (nombre completo, truncado con elipsis); sin nombre, "Hola de nuevo". A la derecha, botón de cerrar con icono X y etiqueta accesible.
3. Lista de entradas, cada una a todo el ancho con alto mínimo de 56 px, icono Lucide a la izquierda y separador inferior:
   - Mi cuenta (`UserRound`) → `/cuenta`
   - Mis pedidos (`Package`) → `/cuenta/pedidos`
   - Mis recetas (`FileText`) → `/cuenta/recetas`
   - Cerrar sesión (`LogOut`) → `signOut()` y `router.refresh()`
4. Al elegir un enlace, el panel se cierra y navega.
5. El menú desplegable (`Menu`) de SPEC 08 se elimina.
6. En celular con sesión, el control abre el mismo panel en vez de enlazar a `/cuenta`.
7. Textos en `messages/es-MX.json`.

## Interfaces & contracts

N/A — cambio de presentación en `components/tienda/account-link.tsx`; no expone ni consume contratos nuevos.

## Edge cases

- Fallo de `signOut()`: el panel queda abierto y muestra un aviso; la sesión no cambia.
- Sesión que expira con el panel abierto: al navegar, `proxy.ts` redirige a `/login` en rutas privadas.
- Nombre muy largo: una sola línea con elipsis; el botón de cerrar nunca se desplaza.
- Teclado: el foco entra al botón de cerrar o a la primera entrada, queda atrapado en el panel y vuelve al control al cerrar con Escape.
- `prefers-reduced-motion`: el panel aparece sin deslizarse.

## Acceptance criteria

- [ ] Dado que tengo sesión en escritorio, cuando activo mi nombre en el header, se abre un panel a la derecha con "Hola de nuevo, {mi nombre}".
- [ ] El panel lista Mi cuenta, Mis pedidos, Mis recetas y Cerrar sesión, cada una con su icono y separador.
- [ ] Dado el panel, al elegir "Mis pedidos" se cierra y navega a `/cuenta/pedidos`.
- [ ] Dado el panel, al elegir "Cerrar sesión" el header vuelve a "Iniciar sesión".
- [ ] Dado un celular con sesión, el control abre el mismo panel a pantalla completa.
- [ ] Dado el panel abierto, Escape lo cierra y el foco vuelve al control.
- [ ] Sin sesión, el popover de SPEC 08 funciona igual que antes.
- [ ] No hay entrada "Devoluciones".
- [ ] Ningún texto nuevo está fuera de `messages/es-MX.json`.

## Risks

Omitido: cambio de presentación reversible, sin migración ni superficie externa nueva.
