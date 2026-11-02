# SPEC 03 — Navegación y home de la tienda

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-02
> **Objective:** Rediseñar la navegación y el home de `lentes-web` para separar armazones de lentes de contacto.

## Context

El header actual solo tiene cuatro enlaces (Diarios, Mensuales, Tóricos, Multifocales), todos de lentes de contacto, y el home habla solo de ese producto. El cliente tampoco puede buscar. GlassesUSA, Zenni y Devlyn comparten un patrón: categorías principales separadas, megamenú por columnas, barra promocional y secciones para comprar por forma o precio. Warby Parker y EyeBuyDirect bloquearon la lectura automática (HTTP 403) y el benchmark de Baymard es de pago, así que los patrones se eligieron por coincidencia entre los sitios leídos, no por una calificación medida.

## Goals

- El cliente distingue y alcanza Armazones o Lentes de contacto en un clic desde cualquier página.
- Un megamenú en escritorio y un menú lateral en móvil llevan a filtros reales del catálogo.
- El cliente busca productos desde el header.
- El home presenta las dos categorías, promociones, formas, precios y destacados.
- Las URL actuales de lentes de contacto siguen funcionando.
- Se conserva el sistema visual del brand book.

## Non-goals

- Compra de armazones: la ficha no agrega al carrito hasta SPEC 04.
- Lentes de sol, probador virtual, quiz, examen de la vista, sucursales, reseñas, favoritos y chat.
- Afirmar envío gratis, garantías, devoluciones o tiempos de entrega que la tienda no respalde.
- Sugerencias mientras se escribe en el buscador.
- Cambiar el nombre "Pupila" o la paleta.
- Cambios al checkout, a la cuenta o a `/recompra`.

## Dependencies

- SPEC 01: `category`, filtros, `q`, `GET /v1/catalog/facets` y `GET /v1/brands?category=`.
- SPEC 02: `GET /v1/home`.
- `@base-ui/react` `navigation-menu`, ya instalado como dependencia. El proyecto todavía no tiene un componente envoltorio.
- Antes de programar, se debe leer la guía aplicable en `node_modules/next/dist/docs/`, como exige `AGENTS.md`.

## Functional requirements

### Header

1. El orden visual es: barra promocional, y debajo logo, navegación principal, buscador, Mi receta, carrito, cuenta y tema.
2. La navegación principal es **Armazones**, **Lentes de contacto** y **Marcas**.
3. La barra promocional muestra `promo_bar.title`, y `cta_label` como enlace si existe. No se muestra si es `null`. El cliente puede cerrarla; el cierre se recuerda en `sessionStorage` y se reinicia si cambia el id.
4. El header sigue fijo al hacer scroll. La barra promocional no es fija.

### Megamenú (desde 1024 px)

5. Se abre con hover con intención (retraso de 150 ms), clic, o teclado. Solo un panel está abierto a la vez.
6. **Armazones** tiene columnas: Para quién (`gender`), Forma (`shape`), Material (`frame_material`), Precio (rangos) y Marcas (hasta 8).
7. **Lentes de contacto** tiene columnas: Por uso (`replacement`), Por necesidad (`lens_type`), Marcas (hasta 8) y Tu receta (Subir mi receta, Mis pedidos).
8. "Por necesidad" usa etiquetas para el cliente: Esféricos · miopía e hipermetropía; Tóricos · astigmatismo; Multifocales · presbicia; Cosméticos.
9. **Marcas** es un panel con todas las marcas y "Ver todas" hacia `/marcas`.
10. Cada columna muestra solo valores con conteo mayor a 0 según las facetas. Una columna sin valores no se muestra.
11. Cada panel incluye "Ver todos los armazones" o "Ver todos los lentes de contacto".
12. La estructura de las columnas, sus títulos y sus rangos de precio viven en `lib/navigation.ts`. Los rangos de precio de armazones son: hasta $999, hasta $1,499 y hasta $2,499 MXN. Se usan en el megamenú, el menú móvil y el home.

### Menú móvil (menos de 1024 px)

13. Un botón de menú abre el `Sheet` existente con las categorías como acordeón, cada grupo también en acordeón, más Mi receta y Mi cuenta.
14. El buscador se muestra siempre en una segunda fila del header móvil.
15. El menú se cierra al navegar y devuelve el foco al botón.

### Buscador

16. Un formulario `GET` hacia `/buscar` con `q`. Funciona sin JavaScript.
17. `/buscar` muestra resultados de ambas categorías, agrupados y con `noindex`.
18. Si `q` tiene menos de 2 caracteres, la página muestra un aviso y no consulta la API.
19. Sin resultados, sugiere ir a Armazones o a Lentes de contacto.

### Catálogos y rutas

20. `/armazones` lista productos con `category=frame` y filtros de Marca, Para quién, Forma, Material, Aro, Color y Precio, con chips activos y URL compartible.
21. `/lentes` conserva su URL y sus filtros, y envía siempre `category=contact_lens`.
22. `/armazones/[slug]` es la ficha del armazón: galería, marca, precio, selector de color, medidas y disponibilidad.
23. Hasta SPEC 04, la ficha no permite comprar y muestra "Muy pronto podrás comprarlo en línea".
24. `/lentes/{slug}` de un armazón y `/armazones/{slug}` de un lente de contacto redirigen de forma permanente a su ruta canónica.
25. `/marcas` es una página nueva con todas las marcas. `/marcas/[slug]` muestra ambas categorías, separadas por secciones.
26. `ProductCard` enlaza según la categoría. En armazones muestra forma y número de colores en lugar del reemplazo.
27. `sitemap.ts` incluye `/armazones`, `/marcas`, y cada producto en su ruta canónica. Cada ficha de armazón declara JSON-LD `Product`.

### Home

28. El orden es: hero, tarjetas de las dos categorías, franja de confianza, comprar por forma, comprar por precio, destacados de armazones, comprar lentes de contacto por uso y necesidad, destacados de lentes de contacto, banners secundarios, marcas.
29. El hero usa `hero` de `GET /v1/home`. Si es `null`, muestra un hero por defecto con ambas categorías.
30. Las secciones de forma, precio y destacados de armazones se ocultan si no hay armazones activos.
31. La franja de confianza conserva las tres promesas existentes: receta revisada, reposición en un clic y pago seguro.
32. Las formas se ilustran con SVG propios que usan los tokens del tema.

### Identidad y medición

33. `lib/brand.ts` y los metadatos dejan de describir la tienda como exclusiva de lentes de contacto, y ajustan la copia del hero por defecto.
34. Se registran en PostHog `nav_click` (`menu`, `column`, `value`) y `search_submitted` (`length`, `results`). No se envía el texto buscado, porque puede contener datos de salud.

## Interfaces & contracts

Sin cambios de API propios: consume los contratos de SPEC 01 y SPEC 02 con el cliente generado por orval.

| Ruta | Render | Parámetros |
|---|---|---|
| `/` | Servidor | — |
| `/armazones` | Servidor | `brand`, `gender`, `shape`, `frame_material`, `rim`, `color`, `min_price_cents`, `max_price_cents` |
| `/armazones/[slug]` | Servidor | — |
| `/lentes` | Servidor | `brand`, `lens_type`, `replacement` |
| `/marcas` | Servidor | — |
| `/buscar` | Servidor, `noindex` | `q` |

```ts
// lib/navigation.ts
type NavLink = { label: string; href: string };
type NavColumn = {
  title: string;
  facet?: string;   // llave de CatalogFacets.values; filtra valores sin productos
  links: NavLink[];
};
type NavItem = { label: string; href: string; columns: NavColumn[] };
```

## Non-functional requirements

- **Rendimiento:** en móvil, LCP del home < 2.5 s y CLS < 0.1 con Lighthouse. Abrir el menú no descarga datos adicionales.
- **Resiliencia:** cada consulta del layout y el home tiene manejo de error; una falla de la API nunca rompe la página.
- **Accesibilidad:** WCAG 2.2 AA. Navegación completa por teclado, `Esc` cierra y devuelve el foco, objetivos táctiles de al menos 44 px, y contraste correcto en tema claro y oscuro.
- **Movimiento:** con `prefers-reduced-motion`, los paneles abren sin animación.
- **Sistema visual:** solo tokens de `globals.css`, breakpoints 600, 1024 y 1440, e iconos Lucide de 1.6 px.
- **Seguridad:** sin orígenes nuevos en la CSP. Las imágenes de banner vienen del origen `NEXT_PUBLIC_IMG_URL` ya permitido. `cta_href` se valida de nuevo antes de renderizar.

## Edge cases

- **API caída al renderizar el layout:** el menú muestra solo los enlaces fijos, sin marcas ni columnas basadas en facetas, y el buscador sigue visible.
- **Sin armazones activos:** "Armazones" no aparece en el menú ni en el home. Si la API falló, sí aparece, porque no se sabe si hay productos.
- **Nombre de marca muy largo:** se trunca en una línea dentro de la columna, con el nombre completo en `title`.
- **Más de 8 marcas en una columna:** muestra las 8 con más productos y "Ver todas".
- **Hover accidental:** mover el cursor en diagonal hacia el panel no lo cierra, y salir de él lo cierra tras 150 ms.
- **Dispositivo táctil a más de 1024 px:** el primer toque abre el panel, sin navegar.
- **Valores inválidos en la URL:** un filtro que no pertenece al enum se ignora y no provoca error de página.
- **Búsqueda con acentos o símbolos:** se codifica en la URL y se muestra como texto, sin interpretarse como HTML.
- **Color agotado en la ficha:** se muestra deshabilitado, y se selecciona el primer color disponible.
- **Enlace antiguo `/lentes?replacement=daily`:** sigue funcionando sin redirección.

## Acceptance criteria

- [ ] Desde cualquier página, Armazones y Lentes de contacto están a un clic, en escritorio y móvil.
- [ ] Cada enlace de los paneles lleva a una lista con al menos un producto.
- [ ] Un valor sin productos activos no aparece en el menú.
- [ ] El megamenú funciona solo con teclado: abrir, recorrer enlaces, `Esc` y retorno del foco.
- [ ] En 360 px no hay scroll horizontal, y el menú lateral recorre todas las categorías.
- [ ] Buscar "acuvue" sin JavaScript muestra resultados en `/buscar?q=acuvue`.
- [ ] `/lentes?replacement=daily` y `/lentes/{slug}` siguen funcionando, y no listan armazones.
- [ ] `/lentes/{slug-de-armazón}` redirige con estado 308 a `/armazones/{slug}`.
- [ ] Con la API detenida, el home y el header responden 200 con su contenido mínimo.
- [ ] Sin armazones en la base, no hay enlaces visibles a un catálogo vacío.
- [ ] Un banner cuyo `cta_href` sea externo no se renderiza como enlace, aunque la API lo devuelva.
- [ ] La ficha del armazón no ofrece compra.
- [ ] Temas claro y oscuro revisados en navegador a 360, 768, 1024 y 1440 px.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.
- [ ] Una auditoría automática de accesibilidad con axe sobre home, `/armazones` y menú abierto no reporta errores serios ni críticos.

## Risks

- **Datos en el layout raíz:** consultar facetas en el header podría frenar todas las páginas. Se mitiga con caché de la consulta y manejo de error, según la guía de Next 16 aplicable.
- **Copia parcial de las referencias:** se reutilizan patrones de interacción, no textos, marcas ni imágenes de esos sitios.
- **Armazones visibles sin poder comprarse:** si SPEC 03 sale a producción antes de SPEC 04, puede frustrar al cliente. Se mitiga sin crear armazones activos en producción hasta terminar SPEC 04.
