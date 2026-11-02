import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cambios y devoluciones",
  description: "Cómo funcionan los cambios y devoluciones de armazones con micas.",
};

export default function ReturnsPage() {
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl">Cambios y devoluciones</h1>
      <section className="space-y-2">
        <h2 className="text-xl">Armazón sin graduación</h2>
        <p>Puedes cambiarlo dentro de los 30 días posteriores a recibirlo, siempre que no se haya usado.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl">Micas a medida</h2>
        <p>
          Las micas graduadas se fabrican especialmente con tu receta, por lo que no tienen devolución,
          salvo por defecto de fabricación o error de la tienda.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl">Si tu receta no se aprueba</h2>
        <p>
          Revisamos tu receta antes de fabricar tus micas. Si no podemos aprobarla, no fabricamos el pedido
          y te reembolsamos.
        </p>
      </section>
    </div>
  );
}
