import type { FrameShape } from "@/lib/api/generated/model";

// Silueta de cada forma de armazón: dos lentes y un puente. Usa el color del texto, así sigue el tema.
const lens: Record<FrameShape, (cx: number) => React.ReactNode> = {
  rectangular: (cx) => <rect x={cx - 15} y={14} width={30} height={20} rx={3} />,
  square: (cx) => <rect x={cx - 14} y={10} width={28} height={28} rx={5} />,
  round: (cx) => <circle cx={cx} cy={24} r={15} />,
  oval: (cx) => <ellipse cx={cx} cy={24} rx={16} ry={11} />,
  cat_eye: (cx) => (
    <path d={cx < 40
      ? `M${cx - 16} 14 C${cx - 6} 16 ${cx + 8} 16 ${cx + 15} 18 C${cx + 16} 28 ${cx + 8} 35 ${cx} 35 C${cx - 10} 35 ${cx - 15} 26 ${cx - 16} 14 Z`
      : `M${cx + 16} 14 C${cx + 6} 16 ${cx - 8} 16 ${cx - 15} 18 C${cx - 16} 28 ${cx - 8} 35 ${cx} 35 C${cx + 10} 35 ${cx + 15} 26 ${cx + 16} 14 Z`} />
  ),
  aviator: (cx) => (
    <path d={cx < 40
      ? `M${cx - 15} 14 C${cx - 5} 11 ${cx + 8} 11 ${cx + 15} 15 C${cx + 15} 27 ${cx + 8} 37 ${cx - 1} 37 C${cx - 11} 37 ${cx - 16} 26 ${cx - 15} 14 Z`
      : `M${cx + 15} 14 C${cx + 5} 11 ${cx - 8} 11 ${cx - 15} 15 C${cx - 15} 27 ${cx - 8} 37 ${cx + 1} 37 C${cx + 11} 37 ${cx + 16} 26 ${cx + 15} 14 Z`} />
  ),
  browline: (cx) => (
    <>
      <path d={`M${cx - 15} 16 H${cx + 15}`} strokeWidth={4} />
      <path d={`M${cx - 15} 16 C${cx - 15} 28 ${cx - 8} 35 ${cx} 35 C${cx + 8} 35 ${cx + 15} 28 ${cx + 15} 16`} />
    </>
  ),
  geometric: (cx) => (
    <path d={`M${cx - 8} 10 H${cx + 8} L${cx + 15} 20 V29 L${cx + 8} 38 H${cx - 8} L${cx - 15} 29 V20 Z`} />
  ),
};

export function FrameShapeIcon({ shape, className }: { shape: FrameShape; className?: string }) {
  return (
    <svg viewBox="0 0 80 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true" className={className}>
      {lens[shape](20)}
      {lens[shape](60)}
      <path d="M35 20 Q40 16 45 20" />
    </svg>
  );
}
