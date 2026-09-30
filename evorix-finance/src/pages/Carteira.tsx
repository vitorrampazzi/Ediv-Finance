// src/pages/Carteira.tsx
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../components/Card';
import { OrbitCoins } from '../components/OrbitCoins';
import { mockPortfolio } from '../data/mockData';

export const Carteira = () => {
  const posicoes = [
    { ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'Ações', qtd: 200, precoMedio: 32.50, precoAtual: 38.45 },
    { ticker: 'ITUB4', nome: 'Itaú Unibanco', tipo: 'Ações', qtd: 150, precoMedio: 29.10, precoAtual: 34.12 },
    { ticker: 'VALE3', nome: 'Vale ON', tipo: 'Ações', qtd: 100, precoMedio: 68.50, precoAtual: 62.30 },
    { ticker: 'BTLG11', nome: 'BTG Logística', tipo: 'FIIs', qtd: 85, precoMedio: 102.00, precoAtual: 105.50 },
    { ticker: 'IVVB11', nome: 'iShares S&P 500', tipo: 'ETFs', qtd: 30, precoMedio: 260.00, precoAtual: 288.90 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com botão de Adicionar */}
      <div className="flex items-center justify-between bg-evo-card border border-evo-border p-6 rounded-xl shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-evo-green/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-evo-textMain tracking-tight">Minha Carteira</h1>
            <p className="text-evo-textSec mt-1">Exemplo de composição de carteira; nenhuma conta ou cotação está conectada.</p>
          </div>
          <span className="inline-flex min-h-10 items-center rounded-lg border border-evo-border px-3 text-xs text-evo-textSec">Cadastro indisponível nesta demonstração</span>
        </div>
        <OrbitCoins variant="portfolio" size="sm" />
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(mockPortfolio.distribution).map(([key, value]) => (
          <Card key={key} glow="none" className="p-4 flex items-center justify-between">
            <span className="text-evo-textSec capitalize font-medium">{key.replace('rendaFixa', 'Renda Fixa')}</span>
            <span className="text-lg font-bold text-evo-textMain font-numbers">{value}%</span>
          </Card>
        ))}
      </div>

      {/* Tabela de Posições */}
      <Card glow="none" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Posições de investimento fictícias para demonstração da interface</caption>
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-evo-textSec text-xs uppercase tracking-wider">
                <th scope="col" className="p-4 font-medium">Ativo</th>
                <th scope="col" className="p-4 font-medium text-right">Qtd</th>
                <th scope="col" className="p-4 font-medium text-right">Preço Médio</th>
                <th scope="col" className="p-4 font-medium text-right">Preço Atual</th>
                <th scope="col" className="p-4 font-medium text-right">Total Investido</th>
                <th scope="col" className="p-4 font-medium text-right">Saldo Atual</th>
                <th scope="col" className="p-4 font-medium text-right">Lucro / Prejuízo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posicoes.map((ativo) => {
                const totalInvestido = ativo.qtd * ativo.precoMedio;
                const saldoAtual = ativo.qtd * ativo.precoAtual;
                const lucro = saldoAtual - totalInvestido;
                const rentabilidade = (lucro / totalInvestido) * 100;
                const isPositivo = lucro >= 0;

                return (
                  <tr key={ativo.ticker} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-evo-textMain group-hover:text-evo-blueMain transition-colors">{ativo.ticker}</span>
                        <span className="text-xs text-evo-textSec">{ativo.tipo}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium text-evo-textMain font-numbers">{ativo.qtd}</td>
                    <td className="p-4 text-right text-evo-textSec font-numbers">R$ {ativo.precoMedio.toFixed(2).replace('.', ',')}</td>
                    <td className="p-4 text-right text-evo-textSec font-numbers">R$ {ativo.precoAtual.toFixed(2).replace('.', ',')}</td>
                    <td className="p-4 text-right text-evo-textSec font-numbers">R$ {totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-medium text-evo-textMain font-numbers">R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right">
                      <div className={`flex flex-col items-end ${isPositivo ? 'text-evo-green' : 'text-evo-red'}`}>
                        <span className="font-bold flex items-center gap-1 font-numbers">
                          {isPositivo ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          R$ {Math.abs(lucro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-medium font-numbers">{isPositivo ? '+' : ''}{rentabilidade.toFixed(2)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
