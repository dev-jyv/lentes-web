import { BRAND } from "@/lib/brand";

// Pupila: lente (borde verde azulado), iris ámbar y pupila de tinta con un destello.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <circle cx="16" cy="16" r="14.2" stroke="var(--logo-ring)" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="8.4" fill="var(--logo-iris-soft)" stroke="var(--logo-iris)" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="3.6" fill="var(--logo-pupil)" />
      <circle cx="14.4" cy="14.4" r="1.1" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <BrandMark className="size-7" />
      <span className="font-display text-xl font-extrabold tracking-tight">{BRAND.wordmark}</span>
    </span>
  );
}
