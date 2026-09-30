// src/pages/analises.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/Card';
import { ScoreIndicator } from '../components/ScoreIndicator';
import { OrbitCoins } from '../components/OrbitCoins';
import { useFavoritos } from '../hooks/useFavoritos';
import { mockAssets } from '../data/mockData';
import { Trophy, ShieldCheck, DollarSign, BarChart3, Star } from 'lucide-react';

export const Analises = () => {
  const [filtroAtivo, setFiltroAtivo] = useState('score');
  const { toggleFavorito, isFavorito } = useFavoritos();

  const ativosOrdenados = [...mockAssets].sort((a, b) => {
    if (filtroAtivo === 'score') return b.score - a.score;
    if (filtroAtivo === 'valuation') return b.indicators.valuation - a.indicators.valuation;
    if (filtroAtivo === 'risco') return a.indicators.risco - b.indicators.risco;
    if (filtroAtivo === 'dividendos') return b.indicators.dividendos - a.indicators.dividendos;
    return 0;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-evo-card border border-evo-border p-6 rounded-xl shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-evo-blueMain/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-evo-textMain tracking-tight">Análise Quantitativa</h1>
          <p className="text-evo-textSec mt-1">Prévia demonstrativa de indicadores; nenhum ativo real foi analisado ou recomendado.</p>
        </div>
        <OrbitCoins variant="scan" size="sm" />
      </div>

      {/* Filtros Inteligentes */}
      <div className="flex flex-wrap gap-3">
        <FiltroBtn ativo={filtroAtivo === 'score'} onClick={() => setFiltroAtivo('score')} icon={<Trophy size={16} />} texto="Maior Score Geral" />
        <FiltroBtn ativo={filtroAtivo === 'valuation'} onClick={() => setFiltroAtivo('valuation')} icon={<BarChart3 size={16} />} texto="Melhor Valuation" />
        <FiltroBtn ativo={filtroAtivo === 'risco'} onClick={() => setFiltroAtivo('risco')} icon={<ShieldCheck size={16} />} texto="Menor Risco" />
        <FiltroBtn ativo={filtroAtivo === 'dividendos'} onClick={() => setFiltroAtivo('dividendos')} icon={<DollarSign size={16} />} texto="Maior nota em dividendos" />
      </div>

      {/* Lista de Top Oportunidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {ativosOrdenados.map((asset, index) => {
          const favoritado = isFavorito(asset.ticker);

          return (
            <Card key={asset.ticker} glow={filtroAtivo === 'score' && index === 0 ? 'blue' : 'none'} className="flex flex-col relative overflow-hidden group hover:border-evo-blueMain/50 transition-all">

              {filtroAtivo === 'score' && index < 3 && (
                <div className="absolute top-0 right-0 bg-evo-blueMain/20 text-evo-blueMain text-[10px] font-bold px-3 py-1 rounded-bl-lg border-b border-l border-evo-blueMain/30">
                  TOP {index + 1}
                </div>
              )}

              <button
                type="button"
                aria-label={favoritado ? `Remover ${asset.ticker} dos favoritos` : `Adicionar ${asset.ticker} aos favoritos`}
                aria-pressed={favoritado}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorito(asset.ticker);
                }}
                className={`absolute left-4 top-4 rounded p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain ${
                  favoritado ? 'text-yellow-500' : 'text-evo-textSec hover:text-yellow-500'
                }`}
              >
                <Star size={18} fill={favoritado ? 'currentColor' : 'none'} />
              </button>

              <div className="flex justify-between items-start mb-4 pl-6">
                <div>
                  <h3 className="text-xl font-bold text-evo-textMain group-hover:text-evo-blueMain transition-colors">{asset.ticker}</h3>
                  <p className="text-sm text-evo-textSec">{asset.name}</p>
                </div>
                <div className="font-numbers">
                  <ScoreIndicator score={asset.score} />
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <BarraIndicador label="Valuation" valor={asset.indicators.valuation} />
                <BarraIndicador label="Fundamentos" valor={asset.indicators.fundamentos} />
                <BarraIndicador label="Risco" valor={asset.indicators.risco} />
                <BarraIndicador label="Dividendos" valor={asset.indicators.dividendos} />
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-evo-textSec">Classificação</span>
                  <span className={`text-sm font-bold ${
                    asset.category === 'Excelente' ? 'text-evo-green' :
                    asset.category === 'Muito Bom' ? 'text-evo-blueMain' : 'text-yellow-500'
                  }`}>
                    {asset.category}
                  </span>
                </div>
                <span className="text-xs text-evo-textSec">Prévia</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

interface FiltroBtnProps {
  ativo: boolean;
  onClick: () => void;
  icon: ReactNode;
  texto: string;
}

const FiltroBtn = ({ ativo, onClick, icon, texto }: FiltroBtnProps) => (
  <button
    type="button"
    aria-pressed={ativo}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      ativo
      ? 'bg-evo-blueMain/20 text-evo-blueMain border border-evo-blueMain/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
      : 'bg-white/[0.02] text-evo-textSec border border-white/5 hover:border-white/20 hover:text-evo-textMain'
    }`}
  >
    {icon}
    {texto}
  </button>
);

const BarraIndicador = ({ label, valor }: { label: string, valor: number }) => {
  const getCorBarra = (v: number) => {
    if (v >= 80) return 'bg-evo-green shadow-[0_0_8px_rgba(0,214,143,0.5)]';
    if (v >= 60) return 'bg-evo-blueMain shadow-[0_0_8px_rgba(59,130,246,0.5)]';
    if (v >= 40) return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]';
    return 'bg-evo-red shadow-[0_0_8px_rgba(255,77,103,0.5)]';
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-evo-textSec">{label}</span>
        <span className="text-evo-textMain font-medium font-numbers">{valor}%</span>
      </div>
      <div
        className="w-full h-1.5 bg-evo-bgMain/60 rounded-full overflow-hidden"
        role="meter"
        aria-label={`${label}: ${valor} de 100`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
      >
        <motion.div
          className={`h-full rounded-full ${getCorBarra(valor)}`}
          initial={{ width: 0 }}
          animate={{ width: `${valor}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
