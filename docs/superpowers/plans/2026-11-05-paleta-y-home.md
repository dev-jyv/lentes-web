# Paleta nueva y home mosaico — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la paleta "Película lagrimal" por la paleta marino + azul + menta en todo el sitio, y rehacer el home como mosaico con fotos y bloques de color.

**Architecture:**
- Los colores son tokens CSS en `app/globals.css`, mapeados a los de shadcn. Cambiar sus valores recolorea todo el sitio.
- Los tokens de marca se renombran y se actualizan sus pocos usos directos. El logo recibe tokens propios para no cambiar.
- El home (`app/(tienda)/page.tsx`) reemplaza sus secciones de categorías y de "Compra lentes" por un componente nuevo, `HomeMosaic`, que recibe los datos de facetas ya calculados en la página.

**Tech Stack:** Next.js 16 (App Router, server components), Tailwind v4 (tokens en CSS), shadcn `base-nova`, i18next (`messages/es-MX.json`), `next/image`.

**Spec:** `docs/superpowers/specs/2026-11-05-paleta-y-home-design.md`

## Global Constraints

- El repo no tiene test runner. Cada tarea se verifica con `pnpm lint`, `pnpm typecheck`, `pnpm build` y, donde se indica, con el chequeo de contraste y la revisión visual en `pnpm dev`.
- Contraste WCAG AA en los dos temas: 4.5:1 en texto normal y 3:1 en texto grande.
- Sobre menta (`#2ee6b6`) y amarillo (`#ffd166`) el texto va siempre en marino (`#0a2540`), nunca en blanco.
- Texto blanco solo sobre `#0066e0` o más oscuro. `#0a7cff` queda para fondos grandes con texto grande y para decoración.
- Ningún token de marca lleva el nombre de un color que ya no es.
- No cambian el nombre, el logo, las tipografías ni nada en `components/ui`.
- Todo texto nuevo va en `messages/es-MX.json` y se lee con `t()`. Comentarios y docs en español; commits en inglés con Conventional Commits.
- Nada de imágenes, logos ni promesas de GlassesUSA o Warby Parker.
- Las fotos se sirven desde `public/home/`. `lib/security-headers.ts` no se toca.
- Rama de trabajo: `feature/home-paleta-mosaico`, creada desde `dev`.

## Chequeo de contraste (lo usan las tareas 1 y 2)

Guarda este script en el scratchpad de la sesión (no en el repo) como `contrast.mjs` y córrelo con `node contrast.mjs <texto> <fondo> ...` (pares de colores hex). Imprime la razón y `OK` si llega a 4.5:

```js
const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i += 2) { const [x, y] = [L(a[i]), L(a[i + 1])]; const r = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); console.log(a[i], a[i + 1], r.toFixed(2), r >= 4.5 ? "OK" : "FALLA"); }
```

## Review Focus

1. **API apagada.** Con `NEXT_PUBLIC_API_URL=http://localhost:9`, el home debe mostrar el hero por defecto y el mosaico con Armazones oculto y los enlaces fijos de lentes (diarios, mensuales, tipos no cosméticos), sin errores. La prueba vive en la tarea 4.
2. **Catálogo sin armazones.** Lentes de contacto toma la foto grande y "Repón en un clic" ocupa la columna derecha completa. No debe quedar ningún hueco. Tarea 4.
3. **Ningún tipo con foto disponible** (solo cosméticos, o API caída sin tóricos). La segunda fila queda solo con bloques de color, sin celda vacía. Tarea 4.
4. **Modo oscuro.** Los bloques de color, el footer marino y el texto secundario deben seguir legibles. El logo debe verse idéntico al de hoy en los dos temas. Tareas 1 y 2.
5. **Celular a 390 px.** El mosaico va en una columna con la foto grande primero, los bloques en dos columnas y sin scroll horizontal. Tarea 4.

---

### Task 1: Tokens de la paleta nueva y sus usos

**Files:**
- Modify: `app/globals.css` (bloques `@theme inline`, `:root`, `:root[data-theme="dark"]`)
- Modify: `components/brand-mark.tsx`, `components/tienda/hero-lens.tsx`, `components/tienda/cart-link.tsx:19`, `components/tienda/product-card.tsx:40`, `app/(tienda)/page.tsx:67,81,104`
- Modify: `docs/BRAND.md`

**Interfaces:**
- Produces: utilidades de Tailwind `bg-navy`, `text-navy`, `bg-blue`, `bg-blue-soft`, `bg-blue-vivid`, `bg-mint`, `bg-mint-soft`, `bg-sun`, `bg-sun-soft`, `text-sun`, más `bg-band` y `text-band`, que se conservan y apuntan al marino. Variables CSS `--blue`, `--blue-soft`, `--blue-vivid`, `--mint`, `--mint-soft`, `--sun`, `--sun-soft`, `--navy` y `--logo-ring`, `--logo-iris`, `--logo-iris-soft`, `--logo-pupil`. Desaparecen `--teal`, `--teal-soft`, `--amber`, `--amber-soft` y sus utilidades.

- [ ] **Step 1: Crear la rama**

```bash
git switch dev && git switch -c feature/home-paleta-mosaico
```

- [ ] **Step 2: Reescribir los tokens de `:root` en `app/globals.css`**

Valores claros:

| Token | Valor |
|---|---|
| `--bg`, `--surface` | `#ffffff` |
| `--ink` | `#101828` |
| `--muted-ink` | `#475467` |
| `--line` | `#e4e9f2` |
| `--navy` | `#0a2540` |
| `--blue` | `#0066e0` |
| `--blue-vivid` | `#0a7cff` |
| `--blue-soft` | `#f0f5ff` |
| `--mint` | `#2ee6b6` |
| `--mint-soft` | `#dff9f1` |
| `--sun` | `#ffd166` |
| `--sun-soft` | `#fff4d6` |
| `--good` | `#177a4f` |
| `--warn` | `#8a5a00` |
| `--band` | `var(--navy)` |
| `--muted` | `#f0f5ff` |
| `--logo-ring` | `#0f7c8c` |
| `--logo-iris` | `#c9851f` |
| `--logo-iris-soft` | `#f7e8cf` |
| `--logo-pupil` | `#0e2230` |

Mapeo de los tokens de shadcn:
- `--primary`, `--ring`, `--sidebar-primary` y `--sidebar-ring` pasan a `var(--blue)`.
- `--secondary`, `--accent` y `--sidebar-accent` pasan a `var(--blue-soft)`.
- `--chart-1..5` pasan a `--blue`, `--mint`, `--sun`, `--navy` y `--muted-ink`.

Valores oscuros, en `:root[data-theme="dark"]`:

| Token | Valor |
|---|---|
| `--bg` | `#07111f` |
| `--surface` | `#0e1c2f` |
| `--ink` | `#e6edf7` |
| `--muted-ink` | `#93a3ba` |
| `--line` | `#1d2d45` |
| `--band` | `#050d18` |
| `--blue` | `#4d9dff` |
| `--blue-soft` | `#10233d` |
| `--mint-soft` | `#0f3a33` |
| `--sun-soft` | `#3a3015` |
| `--good` | `#4cc38a` |
| `--warn` | `#e8b04b` |
| `--muted` | `#10233d` |
| `--primary-foreground`, `--sidebar-primary-foreground` | `#07111f` |
| `--destructive` | `#f2877e` |
| `--logo-ring` | `#43c3d2` |
| `--logo-iris` | `#f0b85a` |
| `--logo-iris-soft` | `#3a2c15` |
| `--logo-pupil` | `#e4edf0` |

`--navy`, `--mint`, `--sun` y `--blue-vivid` no cambian en el tema oscuro. El marino `#0a2540` queda más claro que el fondo `#07111f`, así que los bloques marinos se siguen distinguiendo. La barra promocional y el footer usan `--band`, que en oscuro es `#050d18`.

En `@theme inline` reemplaza `--color-amber` y `--color-amber-soft` por `--color-navy`, `--color-blue`, `--color-blue-soft`, `--color-blue-vivid`, `--color-mint`, `--color-mint-soft`, `--color-sun` y `--color-sun-soft`. Conserva `--color-band`.

Actualiza también el comentario del bloque: "Tokens 'Película lagrimal'" pasa a "Paleta marino + azul + menta (spec 2026-11-05)".

- [ ] **Step 3: Actualizar los usos directos**

- `brand-mark.tsx`: usa `var(--logo-ring)`, `var(--logo-iris-soft)`, `var(--logo-iris)` y `var(--logo-pupil)`, en lugar de `--teal`, `--amber-soft`, `--amber` e `--ink`.
- `hero-lens.tsx`: `--teal-soft` pasa a `--blue-soft`, `--teal` a `--blue-vivid` y `--amber`/`--amber-soft` a `--sun`/`--sun-soft`.
- `cart-link.tsx:19`: `bg-amber … text-background` pasa a `bg-sun … text-navy`.
- `product-card.tsx:40`: `bg-amber-soft … text-warn` pasa a `bg-sun-soft … text-foreground`.
- `page.tsx:67`: `var(--teal)` pasa a `var(--blue-vivid)`.
- `page.tsx:81` y `page.tsx:104`: `text-amber` pasa a `text-sun`.

- [ ] **Step 4: Verificar que no quede ningún token viejo**

Run: `grep -rnE 'teal|amber' app components lib --include='*.tsx' --include='*.ts' --include='*.css'`
Expected: sin resultados.

- [ ] **Step 5: Verificar el contraste**

```bash
node contrast.mjs '#ffffff' '#0066e0' '#475467' '#ffffff' '#475467' '#f0f5ff' '#0066e0' '#f0f5ff' '#0a2540' '#2ee6b6' '#0a2540' '#ffd166' '#177a4f' '#ffffff' '#8a5a00' '#ffffff' '#101828' '#fff4d6' '#07111f' '#4d9dff' '#93a3ba' '#0e1c2f' '#4d9dff' '#0e1c2f' '#e8b04b' '#0e1c2f' '#4cc38a' '#0e1c2f' '#e6edf7' '#10233d'
```

Expected: todas las líneas dicen `OK`.

- [ ] **Step 6: Actualizar `docs/BRAND.md`**

- La primera fila de "Implementado" dice ahora que la paleta "Película lagrimal" quedó reemplazada por marino + azul + menta, con un enlace al spec.
- Lista los tokens nuevos y aclara que el logo conserva sus colores con `--logo-*`.
- Borra la nota del ámbar `#C9851F`/`#E3A33B`.

- [ ] **Step 7: Correr lint, typecheck y build**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: los tres terminan sin errores.

- [ ] **Step 8: Revisión visual**

Con `pnpm dev`, abre `/`, `/lentes`, una ficha de producto, `/carrito` y `/login`, en claro y en oscuro.

Expected:
- Los botones salen en azul `#0066e0`.
- Ningún texto queda ilegible.
- El logo se ve igual que en `main`.

- [ ] **Step 9: Commit**

```bash
git add app/globals.css components docs/BRAND.md "app/(tienda)/page.tsx"
git commit -m "feat: replace brand palette with navy, blue and mint tokens"
```

---

### Task 2: Footer marino

**Files:**
- Modify: `components/tienda/site-footer.tsx`

**Interfaces:**
- Consumes: `bg-band` de la tarea 1.

- [ ] **Step 1: Pasar el footer a fondo marino**

- `<footer>` cambia `mt-16 border-t` por `mt-16 bg-band text-white`.
- El contenedor interno cambia `text-muted-foreground` por `text-white/80`.
- Los enlaces cambian `hover:text-foreground` por `hover:text-white`.

Los enlaces y su orden no cambian. El header no se modifica: ya toma sus colores de los tokens y la barra promocional ya usa `bg-band`.

- [ ] **Step 2: Verificar el contraste del footer**

Run: `node contrast.mjs '#cdd3d9' '#0a2540' '#cdd3d9' '#050d18'`

`#cdd3d9` aproxima el blanco al 80 % sobre marino.

Expected: `OK` en las dos líneas.

- [ ] **Step 3: Correr lint, typecheck y revisión visual**

Run: `pnpm lint && pnpm typecheck`

Revisa el pie en claro y en oscuro, a 390 px y a 1440 px.

Expected: el footer es marino en los dos temas y el logo se distingue.

- [ ] **Step 4: Commit**

```bash
git add components/tienda/site-footer.tsx
git commit -m "feat: give the site footer a navy band"
```

---

### Task 3: Fotos de Unsplash

**Files:**
- Create: `public/home/armazones.jpg`, `public/home/lentes.jpg`, `public/home/esfericos.jpg`, `public/home/toricos.jpg`, `public/home/multifocales.jpg`
- Create: `public/home/CREDITOS.md`
- Modify: `messages/es-MX.json` (bloque `home`)

**Interfaces:**
- Produces:
  - Rutas `/home/{armazones,lentes,esfericos,toricos,multifocales}.jpg`.
  - Claves `home.photos.frames`, `home.photos.lenses`, `home.photos.spherical`, `home.photos.toric` y `home.photos.multifocal`. Cada una es el `alt` en español de su foto.

- [ ] **Step 1: Elegir las cinco fotos en unsplash.com**

| Archivo | Contenido |
|---|---|
| `armazones.jpg` | una persona con armazón |
| `lentes.jpg` | una mano o un dedo con un lente de contacto |
| `esfericos.jpg`, `toricos.jpg`, `multifocales.jpg` | personas en situaciones que sugieran cada uso, por ejemplo leyendo de cerca para multifocales |

Las cinco deben cumplir:
- No tienen marcas de terceros visibles.
- La luz y el tono son coherentes entre sí.
- La licencia es la de Unsplash, no Unsplash+.

- [ ] **Step 2: Descargar las fotos en tamaño web**

Usa la URL `images.unsplash.com/...` de cada foto con estos parámetros:
- `?w=1600&fm=jpg&q=80` para `armazones.jpg` y `lentes.jpg`
- `?w=900&fm=jpg&q=80` para las otras tres

```bash
mkdir -p public/home && curl -L -o public/home/armazones.jpg "<url>?w=1600&fm=jpg&q=80"
```

Run: `ls -l public/home/*.jpg`
Expected: cinco archivos, cada uno de menos de 400 KB.

- [ ] **Step 3: Escribir `public/home/CREDITOS.md`**

Una línea por foto, con este formato:

```
armazones.jpg — Foto de <Autor> en Unsplash: <url de la foto>
```

- [ ] **Step 4: Agregar las claves `home.photos.*` en `messages/es-MX.json`**

Cada clave describe lo que se ve en la foto, por ejemplo "Mujer con armazón redondo sonriendo".

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add public/home messages/es-MX.json
git commit -m "feat: add Unsplash photos for the home mosaic"
```

---

### Task 4: Home mosaico

**Files:**
- Create: `components/tienda/home-mosaic.tsx`
- Modify: `app/(tienda)/page.tsx`
- Modify: `messages/es-MX.json` (bloque `home`)

**Interfaces:**
- Consumes:
  - Las fotos y las claves `home.photos.*` de la tarea 3.
  - Las utilidades `bg-mint`, `bg-sun`, `bg-navy` y `bg-blue-soft` de la tarea 1.
  - Del código existente: `lensNeedLabel` y `replacementLabel` de `lib/format.ts`, `FrameShapeIcon` y `t()`.
- Produces: `export function HomeMosaic({ hasFrames, uses, needs }: { hasFrames: boolean; uses: [string, string][]; needs: [string, string][] })`. `uses` y `needs` son los mismos arreglos `[valor, etiqueta]` que la página ya calcula hoy.

- [ ] **Step 1: Escribir `HomeMosaic` en `components/tienda/home-mosaic.tsx`**

Es un server component, sin `"use client"`, y se compone de tres partes.

**Mosaico principal.** Es un `<section aria-label={t("home.categoriesLabel")}>` con una rejilla.

- En escritorio (`lg:`) usa `grid-cols-[2fr_1fr]` con dos filas:
  - Una celda de foto grande, `row-span-2`, con `aspect-[4/3]`.
  - A la derecha, una foto chica arriba y el bloque menta "Repón en un clic" abajo, que enlaza a `/cuenta/pedidos`.
- Con `hasFrames`, la foto grande es Armazones (`/armazones`) y la chica es Lentes de contacto (`/lentes`).
- Sin `hasFrames`, la foto grande es Lentes de contacto. Armazones no aparece, y el bloque menta ocupa sola la columna derecha (`row-span-2`).

**Celda de foto.** Es un `<Link>` con:
- `next/image` usando `fill`, `unoptimized`, `className="object-cover"` y `sizes` adecuado (`(min-width:1024px) 66vw, 100vw` para la grande, `(min-width:1024px) 33vw, 100vw` para las demás). Sin `priority`.
- Un degradado `bg-gradient-to-t from-navy/80 to-transparent` en la parte de abajo.
- La etiqueta en blanco, `font-display text-2xl font-extrabold`, con una flecha `ArrowRight`.

**Segunda fila y bloques restantes.**
- Los elementos son los usos (`/lentes?replacement=<v>`) más los tipos (`/lentes?lens_type=<v>`), sin el tipo que lleve foto.
- El tipo con foto es el primero que exista en `needs`, en este orden: `toric`, `multifocal`, `spherical`.
- La segunda fila (`grid-cols-3` en `sm:` y más) muestra: elemento 0, la celda de foto del tipo, elemento 1.
- Si no hay tipo con foto, la segunda fila muestra los elementos 0, 1 y 2.
- El resto va debajo, en `grid-cols-2 md:grid-cols-4`, con bloques más bajos.

**Colores de los bloques.** Rotan en este orden, con estas parejas fijas:
1. `bg-blue text-white`
2. `bg-mint text-navy`
3. `bg-navy text-white`
4. `bg-sun text-navy`

Los bloques son `rounded-2xl`, con el texto en `font-display font-semibold` y `min-h-28`.

**Móvil, menos de `lg`.** Todo va en una sola columna, con la foto grande primero. Los bloques de color van en `grid-cols-2`.

Agrega a `messages/es-MX.json`:
- `home.reorderBlock`: "Repón en un clic"
- `home.reorderBlockSub`: "Repite un pedido sin volver a capturar tu graduación."

Borra las claves que queden sin uso: `framesBlurb`, `lensesBlurb` y `buyLenses`, si ya no se leen en ningún lado.

- [ ] **Step 2: Rehacer el orden del home en `app/(tienda)/page.tsx`**

El orden queda así:
1. `<Hero>`, con la franja de confianza.
2. `<HomeMosaic hasFrames uses needs />`.
3. `ProductRow` de armazones destacados, envuelto en `<div className="bg-secondary">` a todo lo ancho.
4. "Encuentra tu forma", la sección `shapes` actual con sus tarjetas en `bg-secondary`.
5. "Por precio", con las mismas bandas pero como pills, con las clases de las pills de marcas.
6. `ProductRow` de lentes destacados.
7. Banners secundarios.
8. Marcas.

Se eliminan la sección `categoriesLabel` actual (las dos tarjetas blancas) y la sección `buyLenses`. Si `tileClass` queda sin uso, también se borra.

Para que las franjas a todo lo ancho funcionen, `ProductRow` acepta un `className?: string` opcional en su `<section>`.

- [ ] **Step 3: Correr lint, typecheck y build**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: los tres terminan sin errores.

- [ ] **Step 4: Revisión visual: catálogo completo**

Con `pnpm dev` y la API local con datos, abre `/` a 390 px y a 1440 px, en claro y en oscuro.

Expected:
- El orden de secciones es el del paso 2.
- La foto grande es Armazones y la segunda fila tiene una foto.
- No hay scroll horizontal a 390 px.

- [ ] **Step 5: Revisión visual: API apagada (Review Focus 1 y 3)**

Run: `NEXT_PUBLIC_API_URL=http://localhost:9 pnpm dev` y abre `/`.

Expected:
- Se ve el hero por defecto.
- La foto grande es Lentes de contacto, sin Armazones.
- Los bloques muestran Diario, Mensual, Esféricos, Tóricos y Multifocales.
- La foto de la segunda fila es Tóricos.
- La consola del servidor no muestra errores de render.

- [ ] **Step 6: Revisión visual: sin armazones y sin tipos con foto (Review Focus 2 y 3)**

Simula los dos casos temporalmente en `page.tsx`, sin hacer commit:
- Fuerza `hasFrames = false` y verifica que el bloque menta ocupa la columna derecha completa, sin huecos.
- Fuerza `needs = needs.filter(([v]) => v === "cosmetic")` y verifica que la segunda fila queda con tres bloques de color, sin celda vacía.

Revierte ambos cambios.

Run: `git diff --stat "app/(tienda)/page.tsx"`
Expected: el diff solo muestra los cambios del paso 2.

- [ ] **Step 7: Commit**

```bash
git add components/tienda/home-mosaic.tsx "app/(tienda)/page.tsx" messages/es-MX.json
git commit -m "feat: rebuild the home as a photo and color mosaic"
```
