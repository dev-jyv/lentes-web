// Solo rutas internas: evita open redirect vía ?next=
export function safeNext(value: string | null | undefined, fallback = "/cuenta") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

// Enlaces de contenido administrable (banners): solo rutas internas, sin otro origen ni caracteres de control.
// La API ya lo valida; aquí se vuelve a comprobar antes de renderizar.
export function isInternalHref(href: string | null | undefined): href is string {
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return false;
  return !/[\u0000-\u001f\u007f-\u009f]/.test(href);
}
