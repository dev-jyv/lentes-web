// Solo rutas internas: evita open redirect vía ?next=
export function safeNext(value: string | null | undefined, fallback = "/cuenta") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
