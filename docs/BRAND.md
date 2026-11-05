# Sistema visual (brand book "Pupila", oct 2026)

Fuente: brand book compartido como artifact (`claude.ai/artifact/7tXv281yj6tx4mVQE9pWgt`). **"Pupila" es un nombre de trabajo:** vive en
`lib/brand.ts`; cambiarlo ahí lo cambia en cabecera, pie, título y metadatos.

## Implementado

| Brand book | Dónde |
|---|---|
| Paleta marino + azul + menta (reemplaza a "Película lagrimal" y "Consulta nocturna"; ver `docs/superpowers/specs/2026-11-05-paleta-y-home-design.md`) | tokens en `app/globals.css` (`--navy`, `--blue`, `--blue-vivid`, `--blue-soft`, `--mint`, `--sun`, `--ink`…) mapeados a los de shadcn. El logo conserva sus colores originales con `--logo-ring`, `--logo-iris`, `--logo-iris-soft` y `--logo-pupil` |
| Tema claro/oscuro | `data-theme` en `<html>`; el script de `app/layout.tsx` lo fija antes del primer pintado (preferencia guardada o del sistema); `components/theme-toggle.tsx` |
| Tipografía: Bricolage Grotesque (títulos), Figtree (texto), IBM Plex Mono (valores ópticos) | `next/font` en `app/layout.tsx`; `font-display`, `font-sans`, utilidad `optic` |
| Valores ópticos en monoespaciada con cifras tabulares | `.optic` en esfera, cilindro, eje, curva base, diámetro, carrito, pedidos y recetas |
| Breakpoints 600 / 1024 / 1440 y contenedor de 1280 px | `@theme` y `container-page` en `globals.css` |
| Animaciones: iris (700 ms), respiración (4 s), contador de precio (220 ms), pop y gota de confirmación (900 ms), shimmer de carga (1.4 s) | keyframes en `globals.css`; hero, ficha de producto, precio del selector, pago confirmado, `Skeleton` |
| `prefers-reduced-motion` desactiva todas las animaciones | regla global en `globals.css` |
| Iconos de línea 1.6 px en rejilla de 24 px | Lucide con `svg.lucide { stroke-width: 1.6 }` |
| Pantallas: inicio, catálogo (barra lateral de 250 px, chips de filtros), producto con selector por ojo, checkout (resumen fijo de 380 px, pasos) | `app/(tienda)/**`, `components/tienda/**` |

## No implementado (el brand book describe un modelo de suscripción que esta tienda no tiene)

- **Suscripción y planes** (1/3/6 meses, descuento por plan, "pausa o cancela en 2 toques", precio por día): no existen en la API ni en el SPEC.
- **Pantalla de seguimiento** ("12 pares restantes", línea de tiempo del envío): requiere pedidos del cliente y guía de envío en la API.
- **Aviso por WhatsApp, envío exprés CDMX, "entrega al día siguiente", validación en menos de 2 horas, categoría "Gotas"**: son promesas operativas que
  hoy no están respaldadas; la copia del sitio solo afirma lo que sí existe (revisión de receta, reposición en un clic, pago con Mercado Pago).
- **Captura de receta con contador de dioptrías (− valor +)**: se mantuvo el selector con solo los valores que existen para el modelo, que evita combinaciones inválidas.
- **Paletas alternativas** ("Iris avellana") y tipografías alternativas (Newsreader/Manrope, Sora).
- **Anillo de reemplazo** (`ring-fill`): el keyframe existe, falta un dato de ciclo de reposición por pedido para usarlo.

## Notas

- Los precios y cifras del brand book son de ejemplo; el sitio solo muestra precios reales de la API.
- Texto blanco solo sobre `--blue` (`#0066e0`) o más oscuro; `--blue-vivid` (`#0a7cff`) es para fondos grandes y decoración. Sobre menta y amarillo el texto va en marino.
- `lentes-admin` (Angular) aún no usa estos tokens.
