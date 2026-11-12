# SPEC 15 — Banners administrables de toda la tienda

> **Status:** Approved
> **Depends on:** SPEC 02, SPEC 03
> **Date:** 2026-11-11
> **Objective:** Permitir que el admin edite desde `lentes-admin` todo el contenido visual de la tienda que hoy está fijo en código: tarjetas del megamenú, mosaico del home, franja de promesas y diapositivas de respaldo del hero.

## Context

SPEC 02 volvió administrables la barra promocional, el hero, los banners secundarios y los destacados del home (`shop.home_banners`, `GET /v1/home`, pantalla "Home" del admin). El resto de lo visual sigue en código, y cambiarlo exige un despliegue:

- **Tarjetas del megamenú** (`lib/navigation.ts`): dos por menú, "Para ella" y "Para él" en Armazones, "Diarios" y "Mensuales" en Lentes. Todas usan un SVG genérico de `public/menu/`, que el propio código marca como provisional.
- **Mosaico del home** (`components/tienda/home-mosaic.tsx`): cinco fotos fijas de `public/home/` (armazones, lentes, tóricos, multifocales y esféricos) y el bloque "Volver a pedir" con texto fijo.
- **Franja de promesas** (`app/(tienda)/page.tsx`): tres textos con ícono bajo el hero (receta revisada, recompra y pago seguro).
- **Diapositivas de respaldo del hero**: tres diapositivas de marca, con ilustración y sin foto (armazones, lentes y reposición). Se muestran cuando no hay ningún hero vigente con imagen.

El negocio quiere cambiar todo esto sin desarrollo, igual que ya hace con los banners del home.

## Goals

- El admin crea, edita, ordena, activa, programa y borra las tarjetas de cada megamenú.
- El admin cambia la foto, el texto alternativo y, cuando aplica, el texto de cada celda del mosaico del home.
- El admin edita los textos e íconos de la franja de promesas.
- Las diapositivas de respaldo pasan a ser banners `hero` normales y precargados, que el admin puede editar o desactivar.
- La tienda sigue obteniendo todo el contenido con la misma consulta pública y cacheable `GET /v1/home`.
- Si la API no responde, la tienda conserva su contenido actual escrito en código, así que nunca queda una sección vacía por una caída.

## Non-goals

- Editar la estructura del menú: categorías, columnas y enlaces de filtros siguen saliendo de las facetas (SPEC 03).
- Constructor de páginas o reordenar las secciones del home.
- Banners en listados, fichas de producto, carrito o checkout.
- Editar textos de interfaz que no son contenido promocional (botones, etiquetas, mensajes de error).
- Íconos libres: la franja de promesas usa un conjunto cerrado de íconos.
- Segmentación, pruebas A/B y métricas por banner (igual que en SPEC 02).
- Borrar de R2 las imágenes que ya no se usan.

## Dependencies

- SPEC 02: tabla `shop.home_banners`, subida de imágenes `home/{uuid}.{ext}`, reglas de vigencia, `cta_href` interno y pantalla "Home" del admin.
- SPEC 03: megamenú construido con facetas y `NavCard`.

## Functional requirements

### Datos

1. Una migración agrega a `shop.banner_placement` los valores `menu_card`, `mosaic` y `promise`.
2. Una migración agrega a `shop.home_banners`:
   - `menu` (`shop.product_category`, nulo): a qué megamenú pertenece una `menu_card`.
   - `slot` (`text`, nulo): qué celda del mosaico ocupa un banner `mosaic`.
   - `icon` (`text`, nulo): qué ícono lleva una `promise`.
   - `art` (`text`, nulo): qué ilustración lleva un `hero` sin imagen.
3. La misma migración precarga como banners activos, con `position` en el orden actual, el contenido que hoy está en código:
   - 3 `hero` de marca sin imagen, con el texto actual de `messages/es-MX.json`.
   - 4 `menu_card` con sus enlaces actuales.
   - 6 `mosaic`: las cinco fotos y el bloque de reposición.
   - 3 `promise`.

   Las fotos actuales de `public/home/` se suben a R2 con llave `home/{uuid}.{ext}` como parte del despliegue.

### Reglas por ubicación

4. `menu_card` exige `menu`, `title` (máximo 40 caracteres), `cta_href`, `image_key` e `image_alt`.
5. La tienda muestra hasta 4 tarjetas vigentes por menú, en orden de `position`. El megamenú ajusta la zona de tarjetas para que 4 quepan sin encimarse con las columnas de enlaces; con menos de 4, las tarjetas no se estiran para llenar el espacio.
6. Una tarjeta cuyo `cta_href` apunte a un filtro sin productos (por ejemplo, `/armazones?gender=kids` sin armazones infantiles) no se muestra. Es la misma regla que hoy aplica `cards()` en `lib/navigation.ts`.
7. `mosaic` exige `slot`, uno de: `frames`, `contact_lens`, `reorder`, `lens_type:spherical`, `lens_type:toric`, `lens_type:multifocal`, `lens_type:cosmetic`. Solo puede haber un banner vigente por `slot`; un segundo vigente en el mismo `slot` responde `409`.
8. Un `mosaic` con slot de foto (todos menos `reorder`) exige `image_key` e `image_alt`, y no admite `title` ni `cta_href`: la etiqueta y el enlace salen del catálogo, para que no se desalineen del filtro al que llevan.
9. El `mosaic` con slot `reorder` exige `title` (máximo 40 caracteres), admite `subtitle` (máximo 80) y no admite imagen. Su enlace es fijo: `/cuenta/pedidos`.
10. `promise` exige `title` (máximo 60 caracteres) e `icon`, uno de: `prescription`, `reorder`, `payment`, `support`, `delivery`, `quality`. No admite imagen ni enlace. La tienda muestra hasta 3 vigentes. El formulario del admin muestra junto al ícono `delivery` el aviso "Usa este ícono solo con promesas de entrega que la tienda cumple" (`docs/BRAND.md`).
11. `hero` admite ahora `image_key` nulo. Sin imagen exige `art`, uno de `lens`, `frame`, `reorder` o `none`, y se dibuja con el fondo de marca actual. Con imagen, `art` debe ser nulo.
12. Las reglas de vigencia (`active`, `starts_at`, `ends_at`) y de `cta_href` interno de SPEC 02 aplican igual a las ubicaciones nuevas.

### API

13. `GET /v1/home` agrega estos campos, con solo banners vigentes:
    - `menu_cards`: objeto con llaves `frame` y `contact_lens`; cada una es una lista ordenada por `position`.
    - `mosaic`: objeto con una entrada por `slot`.
    - `promises`: lista ordenada por `position`.
    - En los heroes, `art`.

    Mantiene `Cache-Control: public, s-maxage=60`.
14. `heroes` incluye ahora los `hero` sin imagen.
15. Los endpoints de admin de SPEC 02 (`/v1/admin/home/banners`) aceptan y devuelven `menu`, `slot`, `icon` y `art`, con las validaciones de los puntos 4 a 11 (`400` o `409`).

### Tienda (`lentes-web`)

16. El megamenú usa `menu_cards` del menú correspondiente en lugar de las tarjetas fijas.
17. Sin tarjetas vigentes, el menú se muestra sin la zona de tarjetas.
18. El mosaico usa la imagen del `slot` que corresponda.
19. Si un `slot` de foto no tiene banner vigente, esa celda se dibuja como bloque de color, igual que hoy se hace con los tipos de lente sin foto.
20. La franja de promesas usa `promises`. Sin promesas vigentes, la franja no se muestra.
21. El hero ya no decide en código cuándo usar diapositivas de marca: muestra lo que traiga `heroes`.
22. Si `GET /v1/home` falla (la API está caída o devuelve `null`), la tienda usa el contenido actual escrito en código para el hero, las tarjetas, el mosaico y las promesas.

### Admin (`lentes-admin`)

23. La pantalla "Home" agrega secciones para "Megamenú", "Mosaico" y "Promesas", con el mismo estado calculado de SPEC 02: Vigente, Programado, Vencido o Inactivo.
24. El formulario pide solo los campos de la ubicación elegida. Para `menu_card` pide el menú, para `mosaic` el slot y para `promise` el ícono, con vista previa del ícono. Para un `hero` pide imagen o ilustración.
25. La sección "Mosaico" muestra los 7 slots en una cuadrícula que imita el home, con la foto vigente de cada uno o el aviso "Sin foto: se muestra un bloque de color".

## Interfaces & contracts

- **Enum `BannerPlacement`:** pasa a `promo_bar | hero | secondary | menu_card | mosaic | promise`.
- **`HomeBanner` y `HomeBannerInput`** agregan:
  - `menu: ProductCategory | null`
  - `slot: string | null`, con patrón `^(frames|contact_lens|reorder|lens_type:[a-z_]+)$`
  - `icon: PromiseIcon | null`, enum nuevo `prescription | reorder | payment | support | delivery | quality`
  - `art: HeroArt | null`, enum nuevo `lens | frame | reorder | none`
- **`HomeBanner.image_url`** pasa a nullable para `hero`.
- **`Home` (respuesta de `GET /v1/home`)** agrega:
  - `menu_cards: { frame: HomeBanner[], contact_lens: HomeBanner[] }`
  - `mosaic: { [slot: string]: HomeBanner }`
  - `promises: HomeBanner[]`

  Todos son requeridos y pueden venir vacíos, así que los clientes viejos los ignoran sin romperse.
- **Validación:**
  - `400` con `detail` en español para campos faltantes o que sobran según la ubicación.
  - `409` para un segundo `mosaic` vigente en el mismo `slot`.
- **Flujo del contrato:** cambia primero en `lentes-api/api/openapi.yaml` y llega por `pnpm api:sync` a `lentes-web` y por la sincronización equivalente a `lentes-admin`.

## Non-functional requirements

- `GET /v1/home` sigue resolviéndose con una sola consulta a la base, sin una consulta por ubicación, y su p95 no sube más de 20 ms.
- Un cambio en el admin aparece en la tienda en un máximo de 60 s, por el caché ya existente.
- El megamenú no hace una consulta propia: usa los datos de `loadHome()` que ya carga el header.

## Edge cases

- **Slot de un tipo de lente sin productos:** un `mosaic` con slot `lens_type:cosmetic` cuando no hay lentes cosméticos se guarda, pero la tienda no lo muestra, porque el mosaico solo incluye tipos con productos.
- **Tarjeta hacia un filtro vacío:** una `menu_card` que apunta a un filtro sin productos se oculta (punto 6), sin error en el admin.
- **Dos `mosaic` en el mismo slot:** un banner vigente y otro programado a futuro en el mismo `slot` sí se permiten, porque solo choca la vigencia simultánea (punto 7). Cuando el programado entra en vigor, el anterior debe haber vencido; si no, el guardado responde `409`.
- **Megamenú con 4 tarjetas en pantallas medianas:** entre `lg` y `xl` las tarjetas pasan a 2 por fila en lugar de reducirse por debajo de un ancho legible.
- **Promesas con menos de 3:** la franja se ajusta a 1 o 2 columnas sin dejar huecos.
- **Hero sin imagen y con `cta_href` vacío:** no se permite; `hero` sigue exigiendo `cta_label` y `cta_href` (SPEC 02).
- **Borrar todos los heroes:** el carrusel no se muestra y el home empieza en la franja de promesas. No vuelve el respaldo de código, porque ese respaldo es solo para la API caída (punto 22).
- **Imagen borrada de R2:** la tienda ya filtra banners con imagen inválida (`imageSrc`); una celda de mosaico sin imagen válida cae al bloque de color.
- **Cliente viejo:** una versión de la tienda desplegada antes de este spec ignora los campos nuevos y sigue mostrando su contenido de código.

## Acceptance criteria

- [ ] La migración crea los 16 banners precargados (3 hero, 4 menu_card, 6 mosaic y 3 promise). Con ellos, el home y el megamenú se ven igual que antes del cambio.
- [ ] Desde el admin se cambia la foto de la celda "Tóricos" del mosaico y la tienda la muestra en 60 s o menos.
- [ ] Desde el admin se agregan una tercera y una cuarta tarjeta al megamenú de Lentes y aparecen sin encimarse con las columnas; una quinta vigente no se muestra.
- [ ] Una `menu_card` con `cta_href` externo responde `400`.
- [ ] Un segundo `mosaic` vigente en el mismo slot responde `409`.
- [ ] Se edita el texto de una promesa y se cambia su ícono, y la franja lo refleja.
- [ ] Al desactivar los 3 heroes de marca y activar uno con foto, el carrusel muestra solo el de foto.
- [ ] Con la API apagada, el home y el megamenú muestran el contenido de código, sin errores en consola.
- [ ] Las pantallas nuevas del admin solo son accesibles con rol `admin`.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan en `lentes-web`, y las pruebas de `lentes-api` y `lentes-admin` pasan.

## Risks

- **Mosaico desalineado:** si el admin desactiva fotos, el mosaico puede verse menos rico que hoy. Se mitiga con el bloque de color de respaldo y con la vista de cuadrícula del admin.
- **Imágenes sin derechos:** el admin puede subir fotos sin derechos de uso. Este spec no lo valida; queda como responsabilidad operativa.
- **Doble fuente de verdad mientras dure la transición:** el contenido de código (para caídas) y el de la base pueden divergir con el tiempo. Se acepta: el de código solo aparece si la API falla.
