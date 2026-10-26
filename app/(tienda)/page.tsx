import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Tus lentes de contacto, a tu puerta
      </h1>
      <p className="text-muted-foreground">
        Elige tu marca, captura tu graduación y recíbelos en todo México.
      </p>
      <Button render={<Link href="/lentes" />} nativeButton={false} size="lg">
        Ver catálogo
      </Button>
    </section>
  );
}
