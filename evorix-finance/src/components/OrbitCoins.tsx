// src/components/OrbitCoins.tsx
import {
  Bitcoin,
  Briefcase,
  CircleDollarSign,
  Coins,
  Gem,
  ScanSearch,
  Star,
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

interface OrbitItem {
  symbol: string;
  color: string;
  glow: string;
}

interface VariantConfig {
  icon: LucideIcon;
  coreColor: string;
  coreBorder: string;
  coreBg: string;
  glow: string;
  orbit: OrbitItem[];
}

const VARIANTS: Record<Variant, VariantConfig> = {
  learning: {
    icon: Coins,
    coreColor: "text-evo-green",
    coreBorder: "border-evo-green/40",
    coreBg: "from-evo-green/15 to-evo-accent/5",
    glow: "rgba(130,183,160,0.16)",
    orbit: [
      { symbol: "R$", color: "text-evo-green", glow: "rgba(130,183,160,0.18)" },
      { symbol: "%", color: "text-evo-accent", glow: "rgba(156,199,197,0.18)" },
      { symbol: "+", color: "text-yellow-400", glow: "rgba(250,204,21,0.16)" },
    ],
  },
  ranking: {
    icon: CircleDollarSign,
    coreColor: "text-evo-accent",
    coreBorder: "border-evo-accent/40",
    coreBg: "from-evo-accent/15 to-evo-green/5",
    glow: "rgba(156,199,197,0.16)",
    orbit: [
      {
        symbol: "R$",
        color: "text-evo-accent",
        glow: "rgba(156,199,197,0.18)",
      },
      { symbol: "%", color: "text-evo-green", glow: "rgba(130,183,160,0.18)" },
      { symbol: "#", color: "text-yellow-400", glow: "rgba(250,204,21,0.16)" },
    ],
  },
  // Dashboard: visão geral do patrimônio
  wealth: {
    icon: Bitcoin,
    coreColor: "text-yellow-500",
    coreBorder: "border-yellow-500/50",
    coreBg: "from-yellow-400/20 to-yellow-600/5",
    glow: "rgba(234,179,8,0.4)",
    orbit: [
      { symbol: "Ξ", color: "text-evo-accent", glow: "rgba(109,151,128,0.24)" },
      { symbol: "$", color: "text-evo-green", glow: "rgba(121,168,142,0.24)" },
      { symbol: "◎", color: "text-evo-accent", glow: "rgba(109,151,128,0.22)" },
    ],
  },
  // Análises: motor escaneando o mercado
  scan: {
    icon: ScanSearch,
    coreColor: "text-evo-accent",
    coreBorder: "border-evo-accent/50",
    coreBg: "from-evo-accent/20 to-evo-accent/5",
    glow: "rgba(109,151,128,0.18)",
    orbit: [
      { symbol: "%", color: "text-evo-green", glow: "rgba(121,168,142,0.24)" },
      { symbol: "#", color: "text-yellow-500", glow: "rgba(234,179,8,0.6)" },
      { symbol: "σ", color: "text-evo-red", glow: "rgba(255,77,103,0.6)" },
    ],
  },
  // Carteira: seus ativos de verdade
  portfolio: {
    icon: Briefcase,
    coreColor: "text-evo-green",
    coreBorder: "border-evo-green/50",
    coreBg: "from-evo-green/20 to-evo-green/5",
    glow: "rgba(121,168,142,0.15)",
    orbit: [
      { symbol: "₿", color: "text-yellow-500", glow: "rgba(234,179,8,0.6)" },
      { symbol: "A", color: "text-evo-accent", glow: "rgba(109,151,128,0.24)" },
      { symbol: "F", color: "text-evo-accent", glow: "rgba(109,151,128,0.22)" },
    ],
  },
  // Assessoria: exclusividade, não é sobre dinheiro
  premium: {
    icon: Gem,
    coreColor: "text-evo-accent",
    coreBorder: "border-evo-accent/50",
    coreBg: "from-evo-accent/20 to-evo-accent/5",
    glow: "rgba(109,151,128,0.18)",
    orbit: [
      { symbol: "★", color: "text-yellow-500", glow: "rgba(234,179,8,0.6)" },
      { symbol: "★", color: "text-evo-accent", glow: "rgba(109,151,128,0.24)" },
      { symbol: "★", color: "text-evo-green", glow: "rgba(121,168,142,0.24)" },
    ],
  },
  // Análises: real brasileiro, bolsa e variação
  real: {
    icon: CircleDollarSign,
    coreColor: "text-evo-green",
    coreBorder: "border-evo-green/50",
    coreBg: "from-evo-green/20 to-evo-green/5",
    glow: "rgba(121,168,142,0.15)",
    orbit: [
      { symbol: "R$", color: "text-evo-green", glow: "rgba(121,168,142,0.28)" },
      {
        symbol: "B3",
        color: "text-evo-accent",
        glow: "rgba(109,151,128,0.24)",
      },
      { symbol: "%", color: "text-yellow-500", glow: "rgba(234,179,8,0.6)" },
    ],
  },
  // Favoritos: estrelas orbitando os ativos salvos
  favorites: {
    icon: Star,
    coreColor: "text-yellow-400",
    coreBorder: "border-yellow-400/50",
    coreBg: "from-yellow-400/20 to-yellow-600/5",
    glow: "rgba(250,204,21,0.4)",
    orbit: [
      { symbol: "★", color: "text-yellow-400", glow: "rgba(250,204,21,0.7)" },
      { symbol: "★", color: "text-evo-accent", glow: "rgba(109,151,128,0.24)" },
      { symbol: "★", color: "text-evo-green", glow: "rgba(121,168,142,0.24)" },
    ],
  },
};

export const OrbitCoins = ({
  variant = "wealth",
  size = "hero",
}: OrbitCoinsProps) => {
  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;

  return (
    <div
      aria-hidden="true"
      className={`orbit-coins orbit-coins--${size} pointer-events-none relative flex shrink-0 items-center justify-center`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="absolute w-full h-full blur-2xl rounded-full animate-pulse"
          style={{ backgroundColor: cfg.glow }}
        />
        <div
          className={`relative animate-spin-y bg-gradient-to-br ${cfg.coreBg} border ${cfg.coreBorder} backdrop-blur-md rounded-full flex items-center justify-center`}
          style={{
            width: "var(--coin-core)",
            height: "var(--coin-core)",
            boxShadow: `0 0 25px ${cfg.glow}`,
          }}
        >
          <Icon
            className={cfg.coreColor}
            style={{ width: "45%", height: "45%" }}
            strokeWidth={1.5}
          />
        </div>
      </div>

      {cfg.orbit.map((c, i) => {
        const duration = 10 + i * 4;
        const delay = -i * 4;
        return (
          <div
            key={i}
            className="coin-orbit absolute inset-0"
            style={
              {
                "--orbit-phase": `${i * 120}deg`,
                "--orbit-duration": `${duration}s`,
                "--orbit-delay": `${delay}s`,
              } as CSSProperties
            }
          >
            <div
              className={`absolute rounded-full border border-white/10 backdrop-blur-sm bg-evo-card/60 flex items-center justify-center font-bold ${c.color}`}
              style={{
                width: "var(--coin-orbit-size)",
                height: "var(--coin-orbit-size)",
                top: "50%",
                left: "50%",
                transform:
                  "translate(-50%, -50%) translateX(var(--coin-radius))",
                boxShadow: `0 0 12px ${c.glow}`,
                fontSize: "calc(var(--coin-orbit-size) * .5)",
              }}
            >
              <span className="coin-orbit-value">{c.symbol}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
