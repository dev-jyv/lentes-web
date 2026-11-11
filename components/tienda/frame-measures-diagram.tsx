import { t } from "@/lib/i18n";

// Vista frontal y lateral esquemática; solo indica dónde se toma cada medida.
export function FrameMeasuresDiagram() {
  return (
    <svg role="img" aria-labelledby="diagrama-medidas" viewBox="0 0 320 190" className="w-full max-w-sm text-muted-foreground">
      <title id="diagrama-medidas">{t("frames.measures.diagram")}</title>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="40" y="40" width="100" height="60" rx="20" className="stroke-foreground" strokeWidth="3" />
        <rect x="180" y="40" width="100" height="60" rx="20" className="stroke-foreground" strokeWidth="3" />
        <path d="M140 58 Q160 46 180 58" className="stroke-foreground" strokeWidth="3" />
        <path d="M40 150 H270 Q285 150 288 165" className="stroke-foreground" strokeWidth="3" />
        <path d="M40 28 H140 M40 23 V33 M140 23 V33" />
        <path d="M140 112 H180 M140 107 V117 M180 107 V117" />
        <path d="M24 40 V100 M19 40 H29 M19 100 H29" />
        <path d="M40 140 H270 M40 135 V145 M270 135 V145" />
      </g>
      <g fill="currentColor" fontSize="12" textAnchor="middle">
        <text x="90" y="18">{t("frames.measures.lensWidth")}</text>
        <text x="160" y="130">{t("frames.measures.bridge")}</text>
        <text x="12" y="70" transform="rotate(-90 12 70)">{t("frames.measures.lensHeight")}</text>
        <text x="155" y="180">{t("frames.measures.temple")}</text>
      </g>
    </svg>
  );
}
