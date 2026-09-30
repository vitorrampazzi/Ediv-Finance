// src/components/OrbitCoins.tsx
import { Bitcoin, ScanSearch, Briefcase, Gem, type LucideIcon } from 'lucide-react';

type Variant = 'wealth' | 'scan' | 'portfolio' | 'premium';

interface OrbitCoinsProps {
  variant?: Variant;
  size?: 'hero' | 'sm';
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
  // Dashboard: visão geral do patrimônio
  wealth: {
    icon: Bitcoin,
    coreColor: 'text-yellow-500',
    coreBorder: 'border-yellow-500/50',
    coreBg: 'from-yellow-400/20 to-yellow-600/5',
    glow: 'rgba(234,179,8,0.4)',
    orbit: [
      { symbol: 'Ξ', color: 'text-indigo-400', glow: 'rgba(129,140,248,0.6)' },
      { symbol: '$', color: 'text-evo-green', glow: 'rgba(0,214,143,0.6)' },
      { symbol: '◎', color: 'text-purple-400', glow: 'rgba(192,132,252,0.6)' },
    ],
  },
  // Análises: motor escaneando o mercado
  scan: {
    icon: ScanSearch,
    coreColor: 'text-evo-blueMain',
    coreBorder: 'border-evo-blueMain/50',
    coreBg: 'from-evo-blueMain/20 to-evo-blueMain/5',
    glow: 'rgba(59,130,246,0.4)',
    orbit: [
      { symbol: '%', color: 'text-evo-green', glow: 'rgba(0,214,143,0.6)' },
      { symbol: '#', color: 'text-yellow-500', glow: 'rgba(234,179,8,0.6)' },
      { symbol: 'σ', color: 'text-evo-red', glow: 'rgba(255,77,103,0.6)' },
    ],
  },
  // Carteira: seus ativos de verdade
  portfolio: {
    icon: Briefcase,
    coreColor: 'text-evo-green',
    coreBorder: 'border-evo-green/50',
    coreBg: 'from-evo-green/20 to-evo-green/5',
    glow: 'rgba(0,214,143,0.4)',
    orbit: [
      { symbol: '₿', color: 'text-yellow-500', glow: 'rgba(234,179,8,0.6)' },
      { symbol: 'A', color: 'text-evo-blueMain', glow: 'rgba(59,130,246,0.6)' },
      { symbol: 'F', color: 'text-purple-400', glow: 'rgba(192,132,252,0.6)' },
    ],
  },
  // Assessoria: exclusividade, não é sobre dinheiro
  premium: {
    icon: Gem,
    coreColor: 'text-purple-400',
    coreBorder: 'border-purple-400/50',
    coreBg: 'from-purple-400/20 to-purple-600/5',
    glow: 'rgba(192,132,252,0.4)',
    orbit: [
      { symbol: '★', color: 'text-yellow-500', glow: 'rgba(234,179,8,0.6)' },
      { symbol: '★', color: 'text-evo-blueMain', glow: 'rgba(59,130,246,0.6)' },
      { symbol: '★', color: 'text-evo-green', glow: 'rgba(0,214,143,0.6)' },
    ],
  },
};

export const OrbitCoins = ({ variant = 'wealth', size = 'hero' }: OrbitCoinsProps) => {
  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;
  const core = size === 'hero' ? 84 : 48;
  const radius = size === 'hero' ? 70 : 42;
  const orbitSize = size === 'hero' ? 22 : 16;

  return (
    <div aria-hidden="true" className="relative flex items-center justify-center shrink-0" style={{ width: core * 2.3, height: core * 2.3 }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-full h-full blur-2xl rounded-full animate-pulse" style={{ backgroundColor: cfg.glow }} />
        <div
          className={`relative animate-spin-y bg-gradient-to-br ${cfg.coreBg} border ${cfg.coreBorder} backdrop-blur-md rounded-full flex items-center justify-center`}
          style={{ width: core, height: core, boxShadow: `0 0 25px ${cfg.glow}` }}
        >
          <Icon size={core * 0.45} className={cfg.coreColor} strokeWidth={1.5} />
        </div>
      </div>

      {cfg.orbit.map((c, i) => {
        const duration = 10 + i * 4;
        const delay = -i * 4;
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{ animation: `orbit ${duration}s linear infinite`, animationDelay: `${delay}s` }}
          >
            <div
              className={`absolute rounded-full border border-white/10 backdrop-blur-sm bg-evo-card/60 flex items-center justify-center font-bold ${c.color}`}
              style={{
                width: orbitSize,
                height: orbitSize,
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translateX(${radius}px)`,
                boxShadow: `0 0 12px ${c.glow}`,
                fontSize: orbitSize * 0.5,
              }}
            >
              {c.symbol}
            </div>
          </div>
        );
      })}
    </div>
  );
};
