// src/pages/Dashboard.tsx
import React from 'react';
import { Card } from '../components/Card';
import { mockPortfolio, mockAssets } from '../data/mockData';
import { ScoreIndicator } from '../components/ScoreIndicator';
import { TrendingUp, DollarSign, Activity, Clock } from 'lucide-react';
import { OrbitCoins } from '../components/OrbitCoins';
import { AlgoInsight } from '../components/AlgoInsight';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<{ size?: number | string }>;
  highlight?: string;
  isPositive?: boolean;
}

const MetricCard = ({ title, value, icon, highlight, isPositive = true }: MetricCardProps) => (
  <Card glow="none" className="flex flex-col gap-2 relative overflow-hidden group">
    <div className="absolute -right-6 -top-6 text-evo-bgMain opacity-50 group-hover:scale-110 transition-transform duration-500">
      {React.cloneElement(icon, { size: 100 })}
    </div>
    <span className="text-evo-textSec font-medium text-sm z-10">{title}</span>
    <span className="text-3xl font-bold text-evo-textMain z-10 font-numbers tracking-tight">{value}</span>
    {highlight && (
      <span className={`text-xs font-semibold z-10 font-numbers ${isPositive ? 'text-evo-green' : 'text-evo-red'}`}>
        {highlight}
      </span>
    )}
  </Card>
);

export const Dashboard = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Título e a animação orbital com Timestamp */}
      <div className="flex items-center justify-between bg-evo-card border border-evo-border p-6 rounded-xl shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-evo-blueMain/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-evo-textMain">Visão Geral do Portfólio</h2>
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
              <Clock size={10} /> Valores ilustrativos
            </span>
          </div>
          <p className="text-evo-textSec">Prévia de patrimônio e indicadores com dados fictícios, sem conexão com o mercado.</p>
        </div>
        <div className="hidden shrink-0 md:block" aria-hidden="true">
          <OrbitCoins variant="wealth" size="hero" />
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Patrimônio Total"
          value={`R$ ${mockPortfolio.totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign />}
          highlight="+2.4% hoje"
        />
        <MetricCard
          title="Rentabilidade Total"
          value={`R$ ${mockPortfolio.totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp />}
          highlight={`+${mockPortfolio.returnPercentage}%`}
          isPositive
        />
        <MetricCard
          title="Volatilidade (Carteira)"
          value="12.4%"
          icon={<Activity />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights com Gatilho de Conversão */}
        <Card glow="blue" className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-5 border-b border-evo-border pb-3">Insights da sua Carteira</h3>
          <div className="space-y-4">
            <AlgoInsight
              type="warning"
              text={<span><strong className="text-evo-textMain">Exemplo de alerta:</strong> em um produto conectado, uma concentração setorial poderia ser sinalizada para análise. Nenhuma carteira real foi analisada aqui.</span>}
            />

            <AlgoInsight
              type="info"
              text={<span><strong className="text-evo-textMain">Exemplo de indicador:</strong> esta área demonstra como análises poderiam ser apresentadas. Não há varredura de ativos, relatório ou recomendação disponível.</span>}
            />
          </div>
        </Card>

        {/* Top Assets */}
        <Card glow="none">
          <h3 className="text-lg font-semibold mb-1">Ativos de exemplo</h3>
          <p className="mb-5 border-b border-evo-border pb-3 text-xs text-evo-textSec">Notas fictícias; não indicam compra ou venda.</p>
          <div className="space-y-3">
            {mockAssets.map(asset => (
              <div key={asset.ticker} className="flex items-center justify-between rounded-lg border border-evo-border bg-evo-bgSec p-3 transition-colors hover:border-evo-blueMain/30">
                <div>
                  <h4 className="font-bold text-evo-textMain">{asset.ticker}</h4>
                  <span className="text-xs text-evo-textSec">{asset.name}</span>
                </div>
                <div className="font-numbers">
                  <ScoreIndicator score={asset.score} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
