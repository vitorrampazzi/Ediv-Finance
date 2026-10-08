import {
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  Files,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

type Variant =
  | "wealth"
  | "scan"
  | "portfolio"
  | "premium"
  | "real"
  | "favorites"
  | "learning"
  | "ranking";

interface OrbitCoinsProps {
  variant?: Variant;
  size?: "hero" | "sm";
}

interface ResearchTheme {
  icon: LucideIcon;
  label: string;
  secondary: LucideIcon;
}

const THEMES: Record<Variant, ResearchTheme> = {
  wealth: { icon: Building2, label: "EMPRESAS", secondary: Files },
  scan: { icon: ScanSearch, label: "ANÁLISE", secondary: Building2 },
  portfolio: { icon: Building2, label: "PESQUISA", secondary: Files },
  premium: { icon: Files, label: "ESTUDO", secondary: BookOpen },
  real: { icon: ScanSearch, label: "MERCADO", secondary: Building2 },
  favorites: { icon: Files, label: "PESQUISA", secondary: Building2 },
  learning: { icon: BookOpen, label: "APRENDER", secondary: Building2 },
  ranking: { icon: ChartNoAxesCombined, label: "PESQUISA", secondary: Files },
};

// Existing pages retain this import name. The visual represents research,
// without prices, instruments or currency symbols.
export function OrbitCoins({
  variant = "wealth",
  size = "hero",
}: OrbitCoinsProps) {
  const theme = THEMES[variant];
  const Icon = theme.icon;
  const Secondary = theme.secondary;
  const learning = variant === "learning";

  return (
    <div
      aria-hidden="true"
      className={`research-visual research-visual--${size} ${learning ? "research-visual--learning" : ""}`}
    >
      <div className="research-visual-grid" />
      <div className="research-visual-plot">
        <svg viewBox="0 0 160 128" fill="none" focusable="false">
          <path d="M14 14V111H149" stroke="currentColor" strokeOpacity=".24" />
          {[24, 47, 70, 93].map((x, index) => (
            <g key={x}>
              <path
                d={`M${x + 6} ${[53, 33, 48, 19][index]}V${[95, 84, 99, 72][index]}`}
                stroke="currentColor"
                strokeOpacity=".5"
              />
              <rect
                x={x}
                y={[64, 46, 59, 35][index]}
                width="12"
                height={[20, 26, 25, 26][index]}
                rx="1"
                fill="currentColor"
                opacity={[0.35, 0.52, 0.3, 0.67][index]}
              />
            </g>
          ))}
          <path
            d="M18 84L38 74L61 84L84 62L110 70L141 42"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="84" cy="62" r="3" fill="currentColor" />
          <circle cx="141" cy="42" r="3" fill="currentColor" />
        </svg>
      </div>
      <div className="research-visual-sheet">
        <div className="research-visual-sheet-heading">
          <Icon strokeWidth={1.4} />
          <span>{theme.label}</span>
        </div>
        <div className="research-visual-lines">
          {[72, 100, 58].map((width, index) => (
            <span
              key={width}
              style={
                {
                  "--research-line-width": `${width}%`,
                  "--research-line-delay": `${index * 0.4}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="research-visual-sheet-footer">
          <span /> <span /> <span />
        </div>
      </div>
      <div className="research-visual-note">
        <Secondary strokeWidth={1.4} />
        <span />
        <span />
      </div>
    </div>
  );
}
