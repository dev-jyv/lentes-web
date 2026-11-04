# Material de proveedores: lentes de contacto

Tarjetones de Alcon y CooperVision dirigidos a profesionales de la visión (ECP). Este archivo resume qué datos sirven para el catálogo y cuáles faltan.

Son fichas técnicas, no un catálogo comercial: **no traen precios, existencias, SKU de proveedor ni imágenes con licencia de uso**. Validar los datos contra el proveedor antes de publicarlos.

## Fuentes

Los PDF no se versionan en este repositorio público; se guardan en la carpeta de Drive del proyecto. Las referencias como `MBECP-PA1123` son el código impreso en cada documento.

| Documento | Marca | Contenido |
| --- | --- | --- |
| Manual ECP digital | Alcon | Familia Air Optix, Total 1, Dailies AquaComfort Plus, tablas de adaptación y QR |
| Parámetros P1 y P1 Tórico | Alcon | Precision 1 esférico y tórico |
| Familia Biofinity, resumen | CooperVision | Familia Biofinity (documento de 2019) |
| Tarjetón Biofinity Energys `BFECP-PA0424` | CooperVision | Biofinity Energys |
| Tarjetón Biofinity, clariti y MyDay `MBECP-PA1123` | CooperVision | Tóricos: Biofinity, clariti 1 day y MyDay |
| Tarjetón MyDay `MDECP-PA0323` | CooperVision | MyDay esférico (solo imagen) |
| Tarjetón MyDay Toric `MDECP-PA0323` | CooperVision | MyDay toric (solo imagen) |
| Tarjetón Liberti | CooperVision | Liberti y Liberti toric |

## Productos identificados

Son 20 productos. `—` significa que el documento no da el dato. "Reg. SSA" es el registro sanitario impreso; `?` indica lectura dudosa por baja resolución.

### Parámetros que ya admite el contrato

`lens_type`, `replacement`, `pieces_per_box`, `material`, `water_content_pct` y, por variante, `base_curve` y `diameter`.

| Marca | Producto | Tipo | Reemplazo | Piezas | Material | Agua % | CB mm | Diám. mm | Reg. SSA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alcon | Air Optix Plus HydraGlyde | spherical | monthly | — | lotrafilcon B | 33 | 8.6 | 14.2 | 1088C2017? |
| Alcon | Air Optix Plus HydraGlyde for Astigmatism | toric | monthly | — | lotrafilcon B | 33 | 8.7 | 14.5 | 0333C2019 |
| Alcon | Air Optix Plus HydraGlyde Multifocal | multifocal | monthly | — | lotrafilcon B | 33 | 8.6 | 14.2 | 1108C2019? |
| Alcon | Air Optix Night & Day Aqua | spherical | monthly | — | lotrafilcon A | 24 | 8.4 / 8.6 | 13.8 | ilegible |
| Alcon | Air Optix Colors | cosmetic | — | — | lotrafilcon B | 33 | 8.6 | 14.2 | ilegible |
| Alcon | Dailies Total 1 | spherical | daily | — | delefilcon A | — | — | — | 0867C2014 |
| Alcon | Dailies AquaComfort Plus | spherical | daily | — | ver conflictos | — | — | — | 1482C2009 |
| Alcon | Precision 1 | spherical | daily | 30 | verofilcon A | 51 | 8.3 | 14.2 | 0070C2020 |
| Alcon | Precision 1 for Astigmatism | toric | daily | 30 | verofilcon A | 51 | 8.5 | 14.5 | 1635C2022 |
| CooperVision | Biofinity | spherical | — | — | comfilcon A | 48 | 8.6 | 14.0 | 2307C2013 |
| CooperVision | Biofinity XR | spherical | — | — | comfilcon A | 48 | 8.6 | 14.0 | 2307C2013 |
| CooperVision | Biofinity Toric | toric | — | 6 | comfilcon A | 48 | 8.7 | 14.5 | 0552C2010 |
| CooperVision | Biofinity XR Toric | toric | — | — | comfilcon A | 48 | 8.7 | 14.5 | 0552C2010 |
| CooperVision | Biofinity Multifocal | multifocal | — | — | comfilcon A | 48 | 8.6 | 14.0 | 2392C2015 |
| CooperVision | Biofinity Energys | spherical | monthly | — | comfilcon A | 48 | 8.6 | 14.0 | 1050C2021 |
| CooperVision | clariti 1 day toric | toric | daily | 30 | somofilcon A | 56 | 8.6 | 14.3 | 0651C2016 |
| CooperVision | MyDay | spherical | daily | 30 | stenfilcon A | 54 | 8.4 | 14.2 | 0518C2017 |
| CooperVision | MyDay toric | toric | daily | ver conflictos | stenfilcon A | 54 | 8.6 | 14.5 | 2416C2017 |
| CooperVision | Liberti | spherical | — | 6 | fanfilcon A | 55 | 8.4 | 14.2 | 0418C2017 |
| CooperVision | Liberti toric | toric | — | 6 | fanfilcon A | 55 | 8.5 | 14.5 | 0419C2017 |

Los tarjetones dan 48% de agua para Biofinity Toric y Energys; en el resto de la familia se asume por usar el mismo material, comfilcon A. Las 6 piezas de Biofinity Toric y Liberti, y las 30 de MyDay, se leen en la foto de la caja, no en una tabla.

### Rangos de graduación

Un paso de `0.25` o `0.50` aplica dentro del tramo indicado.

| Producto | Esfera | Cilindro | Eje | Adición |
| --- | --- | --- | --- | --- |
| Air Optix Plus HydraGlyde | +0.25 a +6.00 (0.25); +6.50 a +8.00 (0.50); hasta -8.00 (0.25); -8.50 a -12.00 (0.50) | — | — | — |
| Air Optix for Astigmatism | +6.00 a -6.00 (0.25); -6.50 a -10.00 (0.50) | -0.75, -1.25, -1.75, -2.25 | 10° a 180° (10°) | — |
| Air Optix Multifocal | +6.00 a -10.00 (0.25) | — | — | LO, MED, HI |
| Air Optix Night & Day Aqua | +6.00 a -8.00 (0.25); -8.50 a -10.00 (0.50); plano | — | — | — |
| Air Optix Colors | plano; +6.00 a -6.00 (0.25); -6.00 a -8.00 (0.50) | — | — | — |
| Dailies Total 1 | -0.50 a -6.00 (0.25); -6.50 a -12.00 (0.50); +0.50 a +6.00 (0.25) | — | — | — |
| Dailies AquaComfort Plus | -0.50 a -6.00 (0.25); -6.00 a -10.00 (0.50); +0.50 a +6.00 (0.25) | — | — | — |
| Precision 1 | -0.50 a -6.00 (0.25); -6.50 a -12.00 (0.50); +0.50 a +6.00 (0.25); +6.50 a +8.00 (0.50) | — | — | — |
| Precision 1 Astigmatism | ver conflictos; plano a -6.00 (0.25); -6.50 a -8.00 (0.50) | -0.75, -1.25, -1.75, -2.25 | según esfera y cilindro | — |
| Biofinity | +8.00 a -12.00 (0.50 después de ±6.00) | — | — | — |
| Biofinity XR | +8.50 a +15.00; -12.50 a -20.00 (0.50) | — | — | — |
| Biofinity Toric | +8.00 a -10.00 (0.50 después de ±6.00) | -0.75, -1.25, -1.75, -2.25 | 10° a 180° (10°) | — |
| Biofinity XR Toric | ver conflictos | -0.75 a -5.75 | 5° a 180° (5°) | — |
| Biofinity Multifocal | +6.00 a -10.00 (0.50 después de ±6.00) | — | — | +1.00, +1.50, +2.00, +2.50; lentes D y N |
| Biofinity Energys | +8.00 a -12.00 (0.50 después de ±6.00) | — | — | — |
| clariti 1 day toric | plano a -6.00 (0.25); -6.50 a -9.00 (0.50); +0.25 a +4.00 (0.25) | -0.75, -1.25, -1.75, -2.25 | según esfera y cilindro | — |
| MyDay | +8.00 a -12.00 (0.50 después de +5.00 y -6.00); no plano | — | — | — |
| MyDay toric | ver conflictos | -0.75, -1.25, -1.75, -2.25 | ver conflictos | — |
| Liberti | +8.00 a -12.00 (0.50 después de ±6.00); no plano | — | — | — |
| Liberti toric | +8.00 a -10.00 (0.50 después de ±6.00) | -0.75, -1.25, -1.75, -2.25 | 10° a 180° (10°) | — |

### Datos que el contrato todavía no admite

`Product` solo guarda material y agua. Estos datos quedarían fuera, salvo como texto libre en `description`:

| Producto | Dk/t a -3.00 D | Espesor central mm | Otros |
| --- | --- | --- | --- |
| Air Optix Plus HydraGlyde | 138 | 0.08 | Uso diario o extendido hasta 6 noches; tinte azul |
| Air Optix for Astigmatism | 108 | 0.102 | Uso diario o hasta 6 noches; marcas a las 3, 6 y 9 |
| Air Optix Multifocal | 138 | 0.08 | Uso diario o hasta 6 noches |
| Air Optix Night & Day Aqua | 175 | 0.08 | Hasta 30 noches de uso continuo, según indique el especialista |
| Air Optix Colors | 138 | 0.08 | Solo uso diario; 9 colores |
| Dailies Total 1 | 156 | — | |
| Precision 1 | 100 | ver conflictos | UV clase I (90% UVA, 99% UVB) |
| Precision 1 Astigmatism | 90 | 0.10 | UV clase I |
| Biofinity y Biofinity XR | 160 | 0.08 | Asférico |
| Biofinity Toric y XR Toric | 116 | 0.11 | Geometría tórica optimizada |
| Biofinity Multifocal | 142 | D 0.10; N 0.09 | Lentes D y N |
| Biofinity Energys | 160 | — | DigitalBoost de +0.30 D |
| clariti 1 day toric | 57 | 0.105 | Módulo 0.5 MPa; con filtro UV |
| MyDay | 100 | 0.08 | UV 85% / 96%; módulo 0.4 MPa |
| MyDay toric | 80 | — | UV 86% / 97%; módulo 0.4 MPa |
| Liberti | 110 | 0.08 | Clase I UV; módulo 0.6 MPa |
| Liberti toric | 90 | 0.10 | Clase I UV; módulo 0.6 MPa |

## Conflictos entre documentos

Resolver con el proveedor antes de cargar:

1. **MyDay toric, rangos.** `MBECP-PA1123` da +8.00 a -10.00 con ejes completos. `MDECP-PA0323` da una matriz más limitada, y su tramo de -2.25 solo admite 6 ejes.
2. **MyDay toric, presentación.** `MDECP-PA0323` indica `90-pack` y prueba de 5; la foto de la caja muestra 30 lentes.
3. **Biofinity XR Toric, esfera.** El resumen de la familia Biofinity (2019) da dos tramos, +8.50 a +10.00 y +10.00 a -10.00. `MBECP-PA1123` da +20.00 a -20.00.
4. **Dailies AquaComfort Plus, material.** El manual imprime "Delefilcon A", el mismo material de Total 1. Parece un error de copia; el dato real debe confirmarse con Alcon.
5. **Precision 1, espesor.** El PDF imprime `0.009` mm para el esférico; probablemente sea `0.09`.
6. **Precision 1 Astigmatism, esfera.** El PDF imprime "-4.00D a +0.25D", que se traslapa con el tramo plano a -6.00. Probablemente sea +0.25 a +4.00.

## Diferencias con `lentes-api/db/seed/seed.sql`

- **Biofinity Multifocal usa adiciones equivocadas.** El seed siembra `LOW/MID/HIGH`; esos valores son de Air Optix Multifocal. Biofinity usa +1.00 a +2.50 con lentes D y N, que hoy no caben como dos atributos: habría que codificarlos en `addition` (por ejemplo, `+1.50 D`) o ampliar el modelo.
- **Biofinity Multifocal usa pasos de 0.50 en toda la esfera.** El documento indica 0.50 solo a partir de ±6.00.
- **El seed cubre una parte del rango**, por ejemplo sin cilindro -2.25 en Air Optix for Astigmatism. Es válido como dato de prueba, no como catálogo.
- Curva base, diámetro, material y agua de los productos Air Optix y Biofinity del seed coinciden con estos documentos. Estos PDF no cubren Acuvue.

## Datos faltantes para vender

- Precio y existencias de cada variante.
- Curva base, diámetro y agua de Total 1 y Dailies AquaComfort Plus. `adminImportVariants` exige `base_curve` y `diameter`, así que estos dos productos no se pueden cargar todavía.
- Reemplazo de Liberti y de la familia Biofinity (salvo Energys). El seed asume mensual para Biofinity.
- Piezas por caja de Air Optix y de la mayoría de Biofinity.
- Nombres de los 9 colores de Air Optix Colors.
- Fichas de clariti 1 day esférico y multifocal, y de MyDay multifocal, si se quieren vender.

## Volumen de variantes

Cada graduación es una variante con SKU y existencia propios. Las opciones publicadas por el fabricante son:

| Producto | Opciones |
| --- | --- |
| Biofinity Toric y XR Toric | 32,796 |
| MyDay toric | 4,392 |
| Air Optix for Astigmatism | 4,104 |
| clariti 1 day toric | 2,332 |

`adminImportVariants` acepta 5,000 filas y 5 MB por archivo, así que Biofinity tórico requiere varios lotes. Antes de cargar, hay que decidir si el catálogo cubre todo el rango o solo las graduaciones de alta rotación, y cómo se representa una graduación disponible bajo pedido.

## Qué se puede usar en el sitio

- **Sí, una vez validado:** ficha técnica, opciones de graduación y descripciones neutras redactadas por nosotros.
- **Con autorización del proveedor:** fotos de cajas y logotipos. Las imágenes dentro de los PDF son de baja resolución; conviene pedir los originales.
- **Requiere revisión regulatoria:** registro sanitario y cualquier beneficio de salud. Los números de aviso o permiso de publicidad de estos PDF amparan esas piezas, no el contenido de esta tienda.
- **No usar:** comparativas contra otras marcas, cifras de estudios ("99.9%", "16 horas", "89%"), mensajes para ópticas ("incremente las ventas"), ni los números de aviso. `MBECP-PA1123` además imprime un aviso sin llenar (`No. de Aviso: XXXX`).
- **No convertir en herramienta para clientes:** las tablas de cálculo de anteojos a lentes de contacto, de distancia al vértice y la guía multifocal son de uso profesional. Sí se puede avisar, con texto propio, que una receta de armazón no equivale a una de lentes de contacto.
