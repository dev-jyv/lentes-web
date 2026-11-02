# SPEC 02 — Contenido administrable del home

> **Status:** Implemented — lentes-api#2, lentes-admin#1
> **Depends on:** SPEC 01
> **Date:** 2026-11-02
> **Objective:** Permitir que el admin programe desde `lentes-admin` la barra promocional, los banners y los productos destacados del home.

## Context

Todo el contenido del home está escrito en código, y sus "novedades" son los cuatro productos más recientes. Cambiar una promoción exige un cambio de código y un despliegue. Las referencias revisadas (GlassesUSA, Zenni y Devlyn) abren con barra promocional y banners, y se decidió que el admin controle ese contenido. La estructura del menú no entra aquí: queda en código y sus filtros salen de los datos del catálogo.

## Goals

- El admin crea, edita, ordena, activa y programa una barra promocional y banners.
- El admin elige qué productos destacar por categoría.
- La tienda obtiene todo con una sola consulta pública y cacheable.
- Una promoción vencida deja de mostrarse sin intervención manual.
- Un enlace de un banner nunca puede sacar al cliente de la tienda ni ejecutar código.

## Non-goals

- Editar la estructura o los enlaces del menú.
- Constructor de páginas o reordenar secciones del home.
- Cupones o descuentos reales: un banner solo comunica, no cambia precios.
- Segmentación por cliente, pruebas A/B y métricas por banner.
- Publicar a una hora exacta: el caché puede retrasar el cambio hasta 60 s.
- Mostrar las promociones en correos.

## Dependencies

Usa el bucket público de R2 (`R2_BUCKET_PUBLIC`, `R2_PUBLIC_BASE_URL`), ya obligatorio en producción. SPEC 01 aporta `ProductCategory`.

## Functional requirements

### Datos

1. Una migración crea `shop.home_banners`: `id`, `placement`, `title`, `subtitle`, `cta_label`, `cta_href`, `image_key`, `image_alt`, `position`, `active`, `starts_at`, `ends_at`, `created_at` y `updated_at`.
2. Una migración crea `shop.home_featured`: `product_id` (PK, FK con `ON DELETE CASCADE`) y `position`. La categoría se obtiene del producto.

### Reglas de banners

3. `placement` es `promo_bar`, `hero` o `secondary`.
4. `promo_bar` exige `title` de máximo 90 caracteres y no admite imagen.
5. `hero` exige `title`, `cta_label`, `cta_href`, `image_key` e `image_alt`. `secondary` exige lo mismo.
6. Un banner está vigente si `active` es verdadero, `starts_at` es nulo o ya pasó, y `ends_at` es nulo o aún no pasa. Se exige `ends_at > starts_at`.
7. La tienda muestra una sola barra promocional, el primer `hero` y hasta 3 `secondary`, siempre según `position`. Se pueden registrar más para programarlos.
8. `cta_href` debe ser una ruta interna: empieza con `/`, no empieza con `//`, y no contiene `\`, saltos de línea ni caracteres de control. Lo demás responde `400`.

### Destacados

9. Hasta 8 destacados por categoría; el noveno responde `409`.
10. Un producto inactivo o agotado sigue guardado como destacado, pero la consulta pública no lo devuelve.
11. `PUT /v1/admin/home/featured` reemplaza la lista completa de una categoría y fija su orden.

### API

12. `GET /v1/home` es pública, se declara en `routeAccess` y responde con `Cache-Control: public, s-maxage=60`.
13. Su respuesta incluye solo banners vigentes, y `image_url` en lugar de `image_key`.
14. `GET`, `POST`, `PUT` y `DELETE` en `/v1/admin/home/banners` exigen rol `admin`. La lista del admin incluye todos los banners, vigentes o no.
15. La imagen se sube con `POST /v1/admin/home/banners/image-url`. Usa las reglas actuales: PUT prefirmado, 10 min, JPG, PNG o WebP, máximo 5 MB, tamaño y tipo firmados.
16. La llave es `home/{uuid}.{ext}`. Al guardar el banner se exige ese prefijo, sin `..`, y un `HEAD` confirma que el objeto existe y es una imagen.
17. Borrar un banner borra su fila. El archivo en R2 se conserva.

### Admin

18. Una entrada "Home" en el menú de `lentes-admin` lleva a `/home`, con carga diferida y dentro de `adminGuard`.
19. La pantalla lista banners agrupados por ubicación, con estado calculado: Vigente, Programado, Vencido o Inactivo.
20. El formulario pide solo los campos de la ubicación elegida, sube la imagen y muestra su vista previa.
21. La pantalla permite ordenar banners y elegir, buscar y ordenar destacados de cada categoría.
22. Las fechas se capturan y muestran en hora de la Ciudad de México y se guardan en UTC.

## Interfaces & contracts

```yaml
BannerPlacement: { type: string, enum: [promo_bar, hero, secondary] }

HomeBanner:
  type: object
  required: [id, placement, title]
  properties:
    id: { type: string, format: uuid }
    placement: { $ref: "#/components/schemas/BannerPlacement" }
    title: { type: string, maxLength: 120 }
    subtitle: { type: string, maxLength: 240, nullable: true }
    cta_label: { type: string, maxLength: 40, nullable: true }
    cta_href: { type: string, maxLength: 200, nullable: true, pattern: "^/(?!/)" }
    image_url: { type: string, format: uri, nullable: true }
    image_alt: { type: string, maxLength: 160, nullable: true }

HomeContent:
  type: object
  required: [promo_bar, hero, secondary, featured]
  properties:
    promo_bar: { allOf: [{ $ref: "#/components/schemas/HomeBanner" }], nullable: true }
    hero: { allOf: [{ $ref: "#/components/schemas/HomeBanner" }], nullable: true }
    secondary: { type: array, maxItems: 3, items: { $ref: "#/components/schemas/HomeBanner" } }
    featured:
      type: object
      required: [contact_lens, frame]
      properties:
        contact_lens: { type: array, maxItems: 8, items: { $ref: "#/components/schemas/Product" } }
        frame: { type: array, maxItems: 8, items: { $ref: "#/components/schemas/Product" } }
```

| Ruta | Auth | Respuesta |
|---|---|---|
| `GET /v1/home` | Pública | `200 HomeContent` |
| `GET /v1/admin/home/banners` | admin | `200 { items: AdminHomeBanner[] }` |
| `POST /v1/admin/home/banners` | admin | `201 AdminHomeBanner`, `400` |
| `PUT /v1/admin/home/banners/{id}` | admin | `200 AdminHomeBanner`, `400`, `404` |
| `DELETE /v1/admin/home/banners/{id}` | admin | `204`, `404` |
| `PUT /v1/admin/home/banners/order` | admin | `200`; debe traer exactamente los banners de una ubicación, o `400` |
| `POST /v1/admin/home/banners/image-url` | admin | `200 ImageUpload`, `400`, `502`, `503` |
| `GET /v1/admin/home/featured?category=` | admin | `200 { items: AdminProduct[] }` |
| `PUT /v1/admin/home/featured` | admin | Cuerpo `{ category, product_ids[] }`; `200`, `400`, `404`, `409` |

`AdminHomeBanner` agrega a `HomeBanner` los campos `image_key`, `position`, `active`, `starts_at` y `ends_at`.

## Edge cases

- Sin banners vigentes: `promo_bar` y `hero` son `null`, `secondary` es vacío, y la tienda muestra su hero por defecto de SPEC 03.
- Dos banners del mismo tipo con vigencia simultánea: gana el de menor `position`, y el admin ve cuál se está mostrando.
- `cta_href` con `javascript:alert(1)`, `https://otro.com`, `//otro.com` o `/\otro.com` responde `400`.
- `cta_href` hacia una ruta interna inexistente se permite y lleva a la página 404 de la tienda.
- Un producto destacado de la categoría equivocada en `PUT /featured` responde `400`.
- Un producto destacado que después se elimina desaparece por el `ON DELETE CASCADE`.
- `R2_BUCKET_PUBLIC` sin configurar: la subida responde `503`, y el admin muestra el mensaje.
- Tras cambiar un banner, puede seguir visible hasta 60 s por el caché.

## Acceptance criteria

- [ ] `GET /v1/home` sin sesión responde `200` con `Cache-Control: public, s-maxage=60`.
- [ ] Un banner con `starts_at` futuro o `ends_at` vencido no aparece en `GET /v1/home`, y sí en la lista del admin.
- [ ] Sin rol admin, cada ruta `/v1/admin/home/*` responde `403`; sin sesión, `401`.
- [ ] Todos los `cta_href` maliciosos de "Edge cases" responden `400`.
- [ ] Una llave de imagen fuera de `home/` o con `..` responde `400`.
- [ ] Un noveno destacado responde `409`, y uno de otra categoría responde `400`.
- [ ] Un destacado inactivo o agotado no se devuelve en `GET /v1/home`.
- [ ] En el admin se crean los tres tipos de banner, se programan, se ordenan y su estado calculado es correcto.
- [ ] Una fecha capturada a las 09:00 de la Ciudad de México se guarda como 15:00 UTC.
- [ ] `auth_test.go` y los tests del servicio pasan con Postgres real.

## Risks

- **Promociones sin respaldo:** un banner puede anunciar algo que la tienda no cumple, con riesgo frente a Profeco. El sistema no lo valida. La responsabilidad es de quien publica, y el admin muestra un aviso breve en el formulario.
- **Archivos huérfanos en R2:** el volumen esperado es bajo y el costo despreciable. Se acepta.
