# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos clientes con el mismo peso, ambos en México y con receta de su optometrista:

- **Usuario de lentes de contacto:** conoce su graduación y vuelve a comprar cuando se le acaban. Su trabajo es reponer sin errores y sin volver a capturar datos.
- **Comprador de armazones:** elige un modelo y lo pide con micas fabricadas a medida según su receta.

Ninguna categoría manda sobre la otra en la tienda.

## Product Purpose

Pupila es una óptica en línea para México (interfaz en español `es-MX`, precios en MXN) que vende armazones y lentes de contacto con graduación. Existe para que comprar lentes con receta en línea cueste menos, sin renunciar a que un profesional revise la receta.

Éxito: el cliente completa la compra con la graduación correcta y vuelve a la tienda para reponer.

## Positioning

La razón para elegir Pupila es el precio. La revisión de cada receta por un optometrista titulado es lo que hace confiable esa compra.

Abierto: el repositorio no contiene datos que sostengan una comparación de precios con ópticas físicas u otras tiendas, ni está definido cómo se formula esta promesa. No publicar una afirmación comparativa, un porcentaje de ahorro o un descuento sin esos datos.

## Operating Context

- El cliente sube una foto o PDF de su receta y captura sus valores. Un optometrista titulado la revisa y la aprueba o la rechaza.
- En lentes de contacto, el cliente elige la graduación por ojo entre los valores que existen para ese modelo.
- Las micas se fabrican a medida. Si la receta no se aprueba, el pedido no se fabrica y se reembolsa. Las micas graduadas no tienen devolución, salvo defecto de fabricación o error de la tienda.
- La recompra parte de un pedido anterior; precios y existencia se confirman al agregar al carrito.
- El pago se hace con Mercado Pago, que incluye tarjeta, OXXO y SPEI.

## Capabilities and Constraints

- **Existe hoy:** catálogo de armazones y lentes de contacto, marcas, búsqueda, carrito anónimo, checkout, cuenta, pedidos, recetas y recompra.
- **Fuera de alcance (no prometer):** suscripciones y planes, envío exprés o al día siguiente, avisos por WhatsApp, validación en menos de 2 horas, gotas, lentes de sol, probador virtual, quiz, examen de la vista, sucursales, reseñas, favoritos, chat, envío gratis y prueba en casa.
- **Texto:** la copia solo afirma lo que la tienda hace; ver `docs/BRAND.md` y `CLAUDE.md`.
- **Regla de negocio:** vive en `lentes-api`; este repositorio no la implementa. Los precios mostrados son los reales de la API.
- **Abierto:** `docs/SPEC.md` deja pendiente validar con un abogado qué exige la regulación mexicana para vender lentes con graduación. No hay confirmación de que ya se hizo.
- **Abierto:** el sitio dice "revisamos tu receta", pero aún no menciona al optometrista titulado; falta decidir si la copia debe nombrarlo.

## Brand Commitments

- "Pupila" es un nombre de trabajo y puede cambiar; se toma de `messages/es-MX.json` y `lib/brand.ts`, nunca escrito a mano.
- El sistema visual vigente está en `docs/BRAND.md`.
- La referencia de lenguaje visual del storefront es GlassesUSA, según `CLAUDE.md`, conservando marca propia y sin copiar sus logos, imágenes ni promesas comerciales.

## Evidence on Hand

- **Revisión de recetas:** confirmada por el dueño del producto: la hace un optometrista titulado.
- **Parámetros de proveedores:** `docs/proveedores`.
- **Ausente, no inventar:** testimonios, reseñas, clientes, cifras de ventas, prensa, comparativas de precio, certificaciones y permisos sanitarios.

## Product Principles

1. **Dos categorías, un solo peso.** Una decisión para contacto no debe dejar en segundo plano a los armazones, ni al revés.
2. **Prometer solo lo que opera.** Cada afirmación debe estar respaldada por lo que el negocio hace hoy.
3. **El precio se demuestra.** El argumento de precio se apoya en precios reales y visibles, no en superlativos ni en ahorros sin datos.
4. **Evitar el error de graduación.** Solo se ofrecen valores válidos para cada modelo, y el cliente confirma su graduación antes de pagar.
5. **La receta es dato de salud.** Recetas y direcciones son datos personales y de salud: nunca se exponen a la analítica ni a grabaciones de sesión.

## Accessibility & Inclusion

WCAG 2.2 AA, con navegación completa por teclado y respeto a `prefers-reduced-motion`.
