# Seguridad de la web

## Cabeceras (`lib/security-headers.ts`, aplicadas en `next.config.ts`)
`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara, micrófono,
geolocalización y pago desactivados), `Cross-Origin-Opener-Policy: same-origin` y HSTS (no en desarrollo).

La CSP se calcula **al compilar** con las variables `NEXT_PUBLIC_*`: `connect-src` solo permite la API, Supabase (https y wss), PostHog (y su host de assets), el origen del DSN de Sentry y el bucket de
R2 para subir recetas (`https://*.r2.cloudflarestorage.com`); `img-src` el dominio de imágenes; `script-src` y `frame-src` Turnstile. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
`frame-ancestors 'none'`. `upgrade-insecure-requests` solo si `NEXT_PUBLIC_SITE_URL` es https. **Si cambia un dominio (API, imágenes, Supabase), hay que recompilar para que la CSP lo incluya.**

### Decisión: CSP sin nonce
Un nonce obliga a renderizar **todas** las páginas en cada petición: se pierde la caché estática y la ISR del catálogo, y es incompatible con Partial Prerendering (guía de Next, *Content Security Policy*).
Se eligió conservar el catálogo estático y aceptar `'unsafe-inline'` en `script-src` y `style-src` (lo que Next inyecta). Pierde algo de defensa contra XSS inyectado; se compensa con el resto de directivas, sin `eval` en
producción y sin HTML crudo de usuarios en la tienda. Si se prefiere una CSP estricta con nonce, hay que aceptar ese costo.

### Verificado
En una compilación de producción local contra la API real: el catálogo y el detalle cargan e hidratan sin violaciones; un `fetch` a un dominio ajeno queda bloqueado por `connect-src`; la API local sí se permite.
**No verificado** con los servicios reales (Supabase, Turnstile, PostHog, Sentry, R2): sus orígenes están en la política, pero hay que confirmar que no aparezcan violaciones en la consola tras el primer despliegue.

## Pendiente fuera del código
Reglas de Cloudflare (WAF, límites en checkout y recetas, Bot Fight Mode); ver `lentes-api/docs/SECURITY.md`.
