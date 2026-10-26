// Lente ilustrado del hero: respira (4 s) y se abre como un iris al cargar. Ambas animaciones
// se desactivan con prefers-reduced-motion (ver globals.css).
export function HeroLens() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="animate-iris">
        <svg viewBox="0 0 240 240" role="img" aria-label="Lente de contacto" className="animate-breathe w-full">
          <circle cx="120" cy="120" r="112" fill="var(--teal-soft)" />
          <circle cx="120" cy="120" r="112" fill="none" stroke="var(--teal)" strokeWidth="1.6" />
          <circle cx="120" cy="120" r="78" fill="var(--amber-soft)" stroke="var(--amber)" strokeWidth="1.6" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={120 + Math.cos(a) * 36} y1={120 + Math.sin(a) * 36}
                x2={120 + Math.cos(a) * 76} y2={120 + Math.sin(a) * 76}
                stroke="var(--amber)" strokeWidth="1.2" opacity="0.55"
              />
            );
          })}
          <circle cx="120" cy="120" r="32" fill="var(--ink)" />
          <circle cx="107" cy="107" r="9" fill="#fff" opacity="0.9" />
        </svg>
      </div>
      <ul className="optic mt-4 flex flex-wrap justify-center gap-2 text-xs" aria-label="Ejemplo de datos de un lente">
        {["PWR −2.75", "BC 8.6", "DIA 14.2"].map((t) => (
          <li key={t} className="rounded-full border bg-card px-3 py-1">{t}</li>
        ))}
      </ul>
    </div>
  );
}
