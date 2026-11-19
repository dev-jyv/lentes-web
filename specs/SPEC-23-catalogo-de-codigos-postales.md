# SPEC 23 — Catálogo de códigos postales con autocompletado de dirección

> **Status:** Approved
> **Depends on:** SPEC 21
> **Date:** 2026-11-18
> **Objective:** Llenar estado, municipio y colonia a partir del código postal en todo formulario de dirección, con un catálogo oficial guardado en `lentes-api`.

## Context

Hoy `AddressForm` (`components/cuenta/address-form.tsx`, compartido por el checkout y `/cuenta/direcciones`) pide colonia, ciudad, estado y código postal como texto libre. El cliente escribe "CDMX", "Ciudad de México" o "cdmx" para el mismo estado, se equivoca de colonia y la paquetería recibe direcciones inconsistentes. Devlyn, la referencia que pidió el responsable, empieza el envío por el código postal y completa el resto ("Cuautepec de Madero · GUSTAVO A. MADERO, Ciudad de México · Cambiar").

En México un código postal abarca uno o varios asentamientos (colonias) de un solo municipio y un solo estado. El único catálogo con validez oficial es el de Correos de México (antes SEPOMEX). Se publica como descarga gratuita (TXT/XLS/XML, ~145 mil asentamientos) y no tiene una API oficial.

Opciones evaluadas para obtener los datos:

| Opción | Costo | Dependencia en tiempo de compra | Frescura |
|---|---|---|---|
| **Catálogo de Correos de México importado a Postgres en `lentes-api`** (elegida) | 0 | Ninguna externa | Se reimporta cada mes |
| API de terceros (COPOMEX y similares, basadas en el mismo catálogo) | Por consulta | Sí: si cae, no hay checkout | La del proveedor |
| Google Places / geocodificación | Por consulta | Sí | No devuelve colonias confiables |
| Proyectos de código abierto alojados por terceros | 0 | Sí, sin SLA | Variable |

Se elige importar el catálogo: los datos son públicos, el tamaño cabe sin problema en Postgres, la consulta por código postal es un índice exacto y el checkout no queda atado a un proveedor externo.

## Goals

- `lentes-api` guarda el catálogo oficial en `shop.postal_codes` y lo expone en un endpoint público de solo lectura.
- Al escribir 5 dígitos en el código postal, el formulario completa estado y municipio y ofrece las colonias de ese código.
- Si el código no existe en el catálogo, el cliente puede capturar los datos a mano (el catálogo nunca bloquea una compra).
- Hay un comando para reimportar el catálogo y una fecha visible de la última importación para el equipo.
- Decisión del responsable (2026-11-18): por ahora el administrador de la cuenta reimporta el catálogo a mano con el comando, una vez al mes, y es quien revisa los términos de uso del catálogo antes de producción.

## Non-goals

- Validar cobertura de paquetería o cotizar envío por código postal (no hay paquetería integrada).
- Geocodificar, mostrar mapas o calcular coordenadas.
- Una tarea programada que descargue e importe el catálogo sola (por ahora es manual).
- Sugerir el código postal a partir de calle y colonia ("No sé mi código postal" de Devlyn). Se deja un enlace a la consulta oficial de Correos de México.
- Corregir direcciones ya guardadas.
- Direcciones fuera de México.

## Dependencies

- SPEC 21: `AddressForm` compartido es donde vive el autocompletado.
- `lentes-api`: tabla, importador y endpoint nuevos. El contrato llega a esta tienda con `pnpm api:sync`.
- Archivo del catálogo descargado del portal de Correos de México.

## Functional requirements

1. `lentes-api` tiene la tabla `shop.postal_codes` con: código postal, asentamiento, tipo de asentamiento, municipio, estado, ciudad (puede ir vacía) y la fecha de importación.
2. Un comando `go run ./cmd/import-postal-codes <archivo>` reemplaza el catálogo dentro de una transacción. Si el archivo no se puede leer o trae menos del 90 % de las filas actuales, aborta y deja el catálogo anterior.
3. `GET /v1/postal-codes/{cp}` es público (sin sesión) y devuelve estado, municipio, ciudad y la lista de colonias ordenada alfabéticamente. Un código válido sin datos responde `404`.
4. La respuesta lleva `Cache-Control: public, max-age=86400`.
5. En `AddressForm` el código postal pasa a ser el primer campo. Con 5 dígitos se consulta el endpoint:
   - Con resultado: estado y municipio se llenan y se muestran como texto con un botón "Cambiar" que los vuelve editables. La colonia es un select con las colonias del código; si hay una sola, queda elegida.
   - El select de colonia incluye "Otra colonia", que muestra un campo de texto.
   - Sin resultado (`404`) o con error de red: aparece un aviso "No encontramos ese código postal; escribe tu dirección" y los campos quedan editables.
6. Junto al campo hay un enlace "No sé mi código postal" a la consulta oficial de Correos de México, que abre en una pestaña nueva.
7. Lo que se guarda en la API sigue siendo `AddressInput` (`neighborhood`, `city`, `state`, `postal_code`). `city` recibe el municipio (o la ciudad cuando el catálogo la trae).
8. Al editar una dirección existente, el formulario no reemplaza los valores guardados hasta que el cliente cambie el código postal.

## Interfaces & contracts

Nuevo en `lentes-api/api/openapi.yaml`:

```yaml
/v1/postal-codes/{cp}:
  get:
    operationId: getPostalCode
    summary: Estado, municipio y colonias de un código postal (catálogo de Correos de México)
    parameters:
      - { name: cp, in: path, required: true, schema: { type: string, pattern: "^[0-9]{5}$" } }
    responses:
      "200": { content: { application/json: { schema: { $ref: "#/components/schemas/PostalCode" } } } }
      "400": { $ref: "#/components/responses/Problem" }
      "404": { $ref: "#/components/responses/Problem" }

PostalCode:
  type: object
  required: [postal_code, state, municipality, neighborhoods]
  properties:
    postal_code: { type: string }
    state: { type: string, description: "Nombre oficial, p. ej. Ciudad de México" }
    municipality: { type: string }
    city: { type: string, nullable: true }
    neighborhoods:
      type: array
      items:
        type: object
        required: [name, type]
        properties:
          name: { type: string }
          type: { type: string, description: "Colonia, Fraccionamiento, Barrio…" }
```

Tabla:

```sql
CREATE TABLE shop.postal_codes (
  postal_code char(5) NOT NULL,
  neighborhood text NOT NULL,
  neighborhood_type text NOT NULL,
  municipality text NOT NULL,
  state text NOT NULL,
  city text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (postal_code, neighborhood, neighborhood_type)
);
```

En la tienda: la llamada usa el hook generado `useGetPostalCode` con `enabled` solo cuando hay 5 dígitos.

## Non-functional requirements

- `GET /v1/postal-codes/{cp}` responde en menos de 50 ms (p95) en la API; es una lectura por llave primaria.
- La consulta del formulario se hace una sola vez por código (React Query la conserva en caché).
- El select de colonias y el aviso se anuncian a lectores de pantalla (`aria-live="polite"`).

## Edge cases

- Código con menos de 5 dígitos o con letras: no se consulta; la validación existente muestra el error.
- Código con 60 o más colonias (pasa en algunas zonas de CDMX): el select permite filtrar escribiendo.
- El cliente cambia el código después de elegir colonia: la colonia se limpia y se vuelve a consultar.
- El catálogo trae nombres en mayúsculas o con abreviaturas: se guardan tal cual vienen. La tienda no los reformatea.
- La API no responde: el formulario queda editable a mano, igual que con `404`.
- Una dirección guardada antes de este cambio tiene un estado escrito distinto del catálogo: se respeta hasta que el cliente cambie el código.

## Acceptance criteria

- [ ] `shop.postal_codes` existe y el importador carga el catálogo completo; una segunda importación reemplaza los datos sin duplicar.
- [ ] El importador aborta sin tocar la tabla si el archivo trae menos del 90 % de las filas.
- [ ] `GET /v1/postal-codes/07200` devuelve Ciudad de México, Gustavo A. Madero y sus colonias; `GET /v1/postal-codes/00000` responde 404.
- [ ] En `/checkout` y `/cuenta/direcciones`, escribir un código válido llena estado y municipio y muestra el select de colonias.
- [ ] "Otra colonia" permite escribir una colonia que no está en la lista.
- [ ] Un código inexistente o una falla de red deja capturar todo a mano.
- [ ] Editar una dirección guardada no altera sus valores hasta cambiar el código postal.
- [ ] Prueba E2E del autocompletado con un código conocido y con uno inexistente.

## Risks

- **Licencia de uso del catálogo.** Es información pública de Correos de México, pero no confirmamos sus términos de reutilización. Mitigación: el administrador de la cuenta los revisa antes de producción.
- **Catálogo desactualizado.** Hay códigos y colonias nuevos cada mes y la reimportación depende de una persona. Mitigación: la captura manual y `imported_at` visible para notar el atraso.
- **Disponibilidad de la descarga.** El portal oficial ha cambiado de URL. Mitigación: el importador recibe un archivo local; no descarga en tiempo de compra.
