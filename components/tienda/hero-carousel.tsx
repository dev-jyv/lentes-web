"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Children, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";

const AUTOPLAY_MS = 6000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(cb: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
}

const arrowClass =
  "absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/75 text-band outline-none transition-colors hover:bg-white focus-visible:ring-3 focus-visible:ring-white sm:grid";

// Carrusel del banner principal. Se apoya en scroll-snap: sin JavaScript sigue deslizándose con el dedo o el trackpad.
// El avance automático se detiene con el botón de pausa, con el cursor o el foco dentro, y con prefers-reduced-motion.
export function HeroCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const multiple = slides.length > 1;
  const autoplay = multiple && !paused && !hovering && !focused && !reducedMotion;

  const goTo = (index: number) => {
    const el = track.current;
    if (!el) return;
    const next = (index + slides.length) % slides.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => {
      const el = track.current;
      if (!el) return;
      el.scrollTo({ left: ((active + 1) % slides.length) * el.clientWidth, behavior: "smooth" });
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [autoplay, active, slides.length]);

  return (
    <section
      aria-roledescription={t("carousel.roleDescription")}
      aria-label={t("carousel.label")}
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div
        ref={track}
        aria-live={autoplay ? "off" : "polite"}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-[30rem] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:h-[34rem] lg:h-[37.5rem] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription={t("carousel.slideRole")}
            aria-label={t("carousel.slidePosition", { position: i + 1, total: slides.length })}
            className="h-full w-full shrink-0 snap-start"
          >
            {slide}
          </div>
        ))}
      </div>

      {multiple && (
        <>
          <button type="button" onClick={() => goTo(active - 1)} aria-label={t("carousel.previous")} className={`${arrowClass} left-4 lg:left-7`}>
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => goTo(active + 1)} aria-label={t("carousel.next")} className={`${arrowClass} right-4 lg:right-7`}>
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-20 flex items-center justify-center gap-1 md:bottom-10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("carousel.goTo", { position: i + 1 })}
                aria-current={i === active ? "true" : undefined}
                className="group grid size-6 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className={`block size-2.5 rounded-full transition-colors ${i === active ? "bg-white" : "bg-white/45 group-hover:bg-white/75"}`} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t("carousel.resume") : t("carousel.pause")}
              className="ml-1 grid size-6 place-items-center rounded-full text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
            >
              {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
