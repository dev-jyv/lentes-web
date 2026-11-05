# Paleta nueva y home mosaico (fase 1 y 2 del rediseño)

Fecha: 2026-11-05 · Estado: aprobado por el dueño (2026-11-05)

## Intención

El dueño siente la tienda anticuada: los colores se ven apagados y el home es plano. Quiere aprovechar que el sitio sigue en desarrollo para darle un aire más moderno, con colores más vivos y más fotos, tomando como referencia GlassesUSA y Warby Parker.

El diagnóstico sobre el código actual:

- **Colores apagados.** Toda la paleta "Película lagrimal" vive en un mismo tono azul grisáceo (fondo `#f2f6f7`, bordes `#d5dfe3`, teal `#0f7c8c`). El color principal casi solo aparece en iconos de línea y enlaces, y el fondo gris apenas se distingue de las tarjetas blancas.
- **Home plano.** Después del hero, las ocho secciones repiten la misma receta: un título `text-2xl` y una rejilla de tarjetas blancas con borde y `py-8`. Ninguna sección cambia de fondo y casi no hay fotos.

Este documento cubre las dos primeras fases de un rediseño de todo el sitio:

1. Paleta global, header y footer.
2. Home en mosaico.

El catálogo y la ficha de producto, el carrito y el checkout, y la cuenta y el login son fases posteriores. Cada una se conversará y documentará por separado.

## Metas

- Paleta viva, base marino con azul, menta y amarillo, en tema claro y oscuro. La aplica todo el sitio al cambiar los tokens.
- Un home con fotos y bloques de color, armado como mosaico de tamaños mezclados.
- Header y footer coherentes con la paleta nueva.

## No metas

- Rediseñar el catálogo, la ficha de producto, el carrito, el checkout o la cuenta. Esas pantallas solo heredan los colores nuevos y su rediseño llega en fases posteriores.
- Cambiar el nombre, el logo o las tipografías (Bricolage Grotesque, Figtree, IBM Plex Mono).
- Gestionar desde el admin las fotos del mosaico. Por ahora son fijas y viven en el repositorio.
- Hacer cambios en `lentes-api`.

## Antimetas (sería un fracaso aunque funcione)

- Texto que no cumpla WCAG AA (4.5:1 en texto normal, 3:1 en texto grande) en cualquiera de los dos temas.
- Usar imágenes, logos o textos de GlassesUSA o Warby Parker, o copiar sus promesas comerciales (envío gratis, prueba en casa, descuentos). Rige `CLAUDE.md` y `docs/BRAND.md`.
- Un home que se rompa o se vea vacío cuando la API no responde o el catálogo no tiene armazones.
- Un home más lento: las fotos no pueden empeorar el LCP de forma notable.

## Decisiones del dueño

### Paleta (opción "C · Marino + azul + menta", sin cambios)

| Rol | Valor claro |
|---|---|
| Marino (barra promo, hero, texto fuerte) | `#0a2540` |
| Azul principal | `#0a7cff` |
| Menta (acento) | `#2ee6b6` |
| Amarillo (acento) | `#ffd166` |
| Fondo de página | `#ffffff` |
| Franja de sección alterna | `#f0f5ff` |
| Texto | `#101828` |
| Bordes | `#e4e9f2` |

- El fondo es blanco y algunas secciones van en franjas de azul muy claro.
- Las tarjetas de categoría son bloques de color sólido, en lugar de tarjetas blancas con borde.

### Fotos

- Son de stock, de Unsplash, "por ahora". Más adelante se reemplazarán por fotos propias.

### Home (opción "B · Mosaico")

El home queda así, de arriba hacia abajo:

1. El hero y la franja de confianza, igual que hoy pero con la paleta nueva.
2. **Mosaico principal.** Una foto grande de Armazones ocupa dos filas a la izquierda. A la derecha van una foto de Lentes de contacto y un bloque menta de "Repón en un clic" que enlaza a `/cuenta/pedidos`.
3. **Segunda fila del mosaico.** Mezcla bloques de color sólido con al menos una foto. En la maqueta: Diarios en azul, Tóricos con foto y Multifocal en amarillo.
4. Armazones destacados sobre una franja `#f0f5ff`.
5. "Encuentra tu forma".
6. Marcas en pills.

Las maquetas aprobadas están en `.superpowers/brainstorm/79688-1793912721/content/paleta.html` y `home-layout.html`. Son de referencia y no se versionan.

## Decisiones de Claude

El dueño aceptó en la conversación las de contraste, modo oscuro, fotos en el repositorio, contenido según catálogo, secciones conservadas y móvil. Las de orden completo, fotos de lentes y logo se tomaron después de la revisión del documento y el dueño las aprobó junto con el documento.

- **Contraste del azul.** El blanco sobre `#0a7cff` da cerca de 4:1, lo que no alcanza AA en texto normal. Los botones, los enlaces y el texto pequeño usan un azul más oscuro, alrededor de `#0066e0`. El `#0a7cff` queda para fondos grandes con texto grande y para decoración. Sobre menta y amarillo el texto va siempre en marino, nunca en blanco.
- **Modo oscuro.** Se conserva, con una versión nocturna de la misma paleta. El valor exacto de cada token oscuro se ajusta a AA. Punto de partida:
  - fondo `#07111f`
  - superficie `#0e1c2f`
  - texto `#e6edf7`
  - texto secundario `#93a3ba`
  - bordes `#1d2d45`
  - principal `#4d9dff`, con texto marino oscuro encima
  - menta y amarillo iguales
  - franja `#050d18`
- **Shadcn.** Los tokens de shadcn (`--primary`, `--accent`, `--secondary`, `--ring`, `--chart-*`…) solo cambian de valor. Ningún componente de `components/ui` se modifica para la paleta.
- **Nombres de tokens.** Ningún token de marca puede llevar el nombre de un color que ya no es: `--teal` no puede seguir guardando un azul. Se renombran y se actualizan todos sus usos (`text-amber`, `bg-amber-soft`, `color-mix(... var(--teal) ...)`, etc.).
- **Fotos en el repositorio.**
  - Se descargan a `public/home/` en tamaño web (WebP o JPEG de unos 1600 px de lado mayor en la grande y menos en las chicas) y se sirven desde el propio dominio, así que el CSP no cambia.
  - Cada foto lleva un `alt` en español en `messages/es-MX.json`.
  - El crédito de cada foto (autor y URL de Unsplash) va en `public/home/CREDITOS.md`.
- **Contenido del mosaico según el catálogo**, con la misma lógica de facetas que hoy:
  - Sin armazones (`hasFrames` falso), la foto grande pasa a Lentes de contacto y Armazones no aparece.
  - Un uso (`replacement`) o tipo (`lens_type`) sin productos no aparece.
  - Con la API caída se usan los enlaces fijos que el home ya ofrece hoy (diarios, mensuales y los tipos no cosméticos).
  - Las opciones de lentes que no caben en las dos primeras filas siguen como bloques de color más pequeños, alternando azul, menta, marino y amarillo.
- **Orden completo del home** (sustituye a la lista de seis puntos de arriba):
  1. hero
  2. franja de confianza
  3. mosaico principal
  4. segunda fila del mosaico y bloques de lentes restantes. Esto absorbe la sección actual "Compra lentes".
  5. armazones destacados sobre franja `#f0f5ff`
  6. "Encuentra tu forma"
  7. "Por precio" en pills
  8. lentes destacados
  9. banners secundarios del admin
  10. marcas en pills

  Cada sección se oculta si no tiene datos, igual que hoy.
- **Fotos de lentes en la segunda fila.**
  - Se consiguen tres fotos, una por tipo: esféricos, tóricos y multifocales.
  - La celda con foto la toma el primer tipo disponible, en este orden: tóricos, multifocales, esféricos. Los demás usos y tipos van como bloques de color.
  - Si no hay ningún tipo con foto disponible, la segunda fila queda solo con bloques de color.
  - En total se descargan cinco fotos: armazones, lentes de contacto y los tres tipos.
- **Logo.** No cambia. `components/brand-mark.tsx` deja de leer `--amber` y `--amber-soft` y pasa a tokens propios del logo (`--logo-*`) con los valores actuales (`#c9851f`, `#f7e8cf` y sus equivalentes oscuros). `hero-lens.tsx` es decorativo y sí sigue la paleta nueva.
- **Móvil.** El mosaico se apila en una columna, con la foto grande primero. Los bloques de color quedan en dos columnas.
- **Header.** Mantiene la estructura actual: fondo blanco, enlaces de texto, buscador en pill gris y la cuenta con etiqueta. Solo cambian los colores. La barra promocional usa el marino.
- **Footer.** Pasa a fondo marino con texto claro, así el pie cierra la página con color en lugar de una línea gris. Conserva los mismos enlaces.
- **Documentación.** `docs/BRAND.md` se actualiza: la paleta "Película lagrimal" queda reemplazada y se registran los tokens nuevos.

## Restricciones

- Next.js 16 y Tailwind v4: los tokens viven en `app/globals.css` y no hay configuración en JS.
- El texto de la interfaz va en `messages/es-MX.json` y se lee con `t()`. La marca se toma de `BRAND` o de `{{brand}}`.
- Las imágenes van con `next/image` y `unoptimized`, igual que el resto del home. Solo la imagen principal visible lleva `priority`.
- `prefers-reduced-motion` sigue desactivando toda animación nueva.
- CI corre `pnpm lint`, `pnpm typecheck` y `pnpm build`. No hay tests unitarios.

## A criterio de quien implemente

- La paleta oscura exacta, dentro de AA.
- Qué fotos concretas de Unsplash usar, mientras sean de personas con armazones o lentes de contacto, sin marcas visibles de terceros, y coherentes entre sí en luz y tono.
- Los tamaños exactos de las celdas del mosaico y sus breakpoints.
- Si "Encuentra tu forma" lleva fondo de color o se queda en blanco con bloques `#f0f5ff`.
- Cómo encaja el bloque "Repón en un clic" cuando no hay armazones.

## Cómo se comprueba

- `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.
- Revisión visual del home en claro y oscuro, en celular (390 px) y escritorio (1440 px), en tres casos: con catálogo completo, sin armazones y con la API apagada.
- Revisión de contraste de botones, enlaces, texto sobre menta y amarillo, y footer en los dos temas.
- Recorrido rápido por catálogo, ficha de producto, carrito, checkout y cuenta para confirmar que heredan la paleta sin texto ilegible.
