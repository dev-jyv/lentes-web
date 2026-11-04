import { Fragment, type ReactNode } from "react";

// Pinta un mensaje con etiquetas propias, p. ej. rich(t("x"), { link: (c) => <Link href="/">{c}</Link> }).
// Una etiqueta desconocida se queda como texto; React escapa todo lo demás. No admite etiquetas anidadas.
export function rich(text: string, tags: Record<string, (content: string) => ReactNode>): ReactNode {
  return text.split(/(<\w+>.*?<\/\w+>)/).map((part, i) => {
    const match = part.match(/^<(\w+)>(.*)<\/\1>$/);
    const render = match && tags[match[1]];
    return <Fragment key={i}>{render ? render(match[2]) : part}</Fragment>;
  });
}
