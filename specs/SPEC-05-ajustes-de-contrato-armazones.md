# SPEC 05 — Ajustes de contrato de armazones

> **Status:** Implemented — lentes-api#2, lentes-admin#1, lentes-web#1
> **Depends on:** SPEC 01, SPEC 02, SPEC 03, SPEC 04
> **Date:** 2026-11-02
> **Objective:** Documentar los campos y decisiones que la implementación de SPEC 01 a SPEC 04 agregó a sus contratos.

## Context

Al implementar SPEC 01 a SPEC 04 aparecieron huecos: lo que un spec pedía no siempre tenía un campo o una regla en el contrato de otro. Se resolvieron para poder cumplirlos, pero un spec aprobado no se edita, así que este spec los deja por escrito para su revisión. El código ya existe en los PR de esa implementación.

## Goals

- Dejar registrado cada campo agregado al contrato y su motivo.
- Dejar registrada cada decisión de comportamiento que los specs no definían.
- Permitir que el responsable acepte o pida cambiar cada punto.

## Non-goals

- Agregar comportamiento o campos nuevos.
- Cambiar el alcance de SPEC 01 a SPEC 04.
- Resolver los requisitos operativos y legales para activar la venta de armazones.

## Functional requirements

1. `Product.color_count` da el número de colores activos, porque SPEC 03 lo muestra en la tarjeta y SPEC 01 no lo incluía.
2. `base_curve` y `diameter` son nullable en `CartItem` y `OrderItem`, porque un armazón no tiene esos datos y un 0 sería un dato falso.
3. `Cart.frame_lead_time_days` da el tiempo de entrega en el checkout, que SPEC 04 exige mostrar.
4. `OrderSummary.reorderable` y `OrderSummary.frame_lines` permiten mostrar armazones en el historial y ocultar "Volver a pedir" en pedidos solo de armazones.
5. `AdminOrder` agrega `lab_blockers`, `refund_required`, `glasses_prescription_status`, `pd_mm` y los enlaces a los archivos de receta, para cumplir la regla de laboratorio de SPEC 04.
6. `PrescriptionReview.status` es opcional, porque la distancia pupilar se captura también después de aprobar la receta. La solicitud debe traer `status` o `pd_mm`.
7. `ProductInput.category` es opcional: al crear asume `contact_lens` y al editar conserva la actual, para que el admin anterior siga funcionando durante el despliegue.
8. Un armazón rechaza `requires_prescription: true`, `material` y `water_content_pct`, porque la receta depende del paquete y el material es `frame.material`.
9. Si el admin no ha elegido destacados, el home muestra los productos más recientes de la categoría.
10. Los armazones y paquetes de ejemplo están en `db/seed/frames_dev.sql` (`make seed-frames`), separados del seed normal.
11. Una línea de armazón en el correo usa `eye: frame`, que se muestra como "Armazón con micas".

## Interfaces & contracts

La fuente de verdad es `lentes-api/api/openapi.yaml`.

```yaml
Product:
  color_count: { type: integer }
CartItem:
  base_curve: { type: number, nullable: true }
  diameter: { type: number, nullable: true }
OrderItem:
  base_curve: { type: number, nullable: true }
  diameter: { type: number, nullable: true }
Cart:
  frame_lead_time_days: { type: integer, nullable: true }
OrderSummary:
  reorderable: { type: boolean }
  frame_lines: { type: array, items: { type: string } }
AdminOrder:
  glasses_prescription_id: { type: string, format: uuid, nullable: true }
  glasses_prescription_status: { $ref: "#/components/schemas/RxStatus", nullable: true }
  pd_mm: { type: number, nullable: true }
  refund_required: { type: boolean }
  prescription_file_url: { type: string, nullable: true }
  glasses_prescription_file_url: { type: string, nullable: true }
  lab_blockers: { type: array, items: { type: string } }
```

## Edge cases

- Un pedido anterior a los armazones no trae `category` en su snapshot: se lee como `contact_lens`.
- Un `PATCH` de receta sin `status` ni `pd_mm` responde `400`.
- Sin almacenamiento de recetas, el detalle del pedido responde con los enlaces en `null`.
- Con la API caída, el home no muestra destacados ni recientes y conserva el resto de la página.

## Acceptance criteria

- [x] El responsable revisa cada punto de "Functional requirements" y lo acepta o pide cambiarlo.
- [x] Todo punto rechazado se atiende en un spec nuevo.
