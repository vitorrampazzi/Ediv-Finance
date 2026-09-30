// src/pages/Favoritos.tsx
import { Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ScoreIndicator } from '../components/ScoreIndicator';
import { mockAssets } from '../data/mockData';
import { useFavoritos } from '../hooks/useFavoritos';

export const Favoritos = () => {
  const { favoritos, toggleFavorito } = useFavoritos();
  const ativosFavoritados = mockAssets.filter(asset => favoritos.includes(asset.ticker));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-evo-textMain tracking-tight">Favoritos</h1>
        <p className="text-evo-textSec mt-1">Lista local de ativos demonstrativos. Não acompanha preços ou notícias.</p>
      </div>

      {ativosFavoritados.length === 0 ? (
        <Card glow="none" className="flex flex-col items-center text-center py-16 gap-3">
          <Star size={40} className="text-evo-textSec" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-evo-textMain">Nenhum favorito ainda</h3>
          <p className="text-sm text-evo-textSec max-w-sm">
            Vá até a página de Análises e clique na estrela de qualquer ativo pra acompanhá-lo aqui.
          </p>
          <Link
            to="/analises"
            className="mt-2 flex items-center gap-1.5 text-evo-blueMain hover:text-evo-blueSec font-medium text-sm transition-colors"
          >
            Ir para Análises <ChevronRight size={16} />
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ativosFavoritados.map(asset => (
            <Card key={asset.ticker} glow="none" className="flex flex-col relative overflow-hidden group hover:border-evo-blueMain/50 transition-all">
              <button
                type="button"
                aria-label={`Remover ${asset.ticker} dos favoritos`}
                aria-pressed="true"
                onClick={() => toggleFavorito(asset.ticker)}
                className="absolute right-4 top-4 rounded p-1 text-yellow-500 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-blueMain"
                title="Remover dos favoritos"
              >
                <Star size={20} fill="currentColor" />
              </button>

              <div className="flex justify-between items-start mb-4 pr-8">
                <div>
                  <h3 className="text-xl font-bold text-evo-textMain group-hover:text-evo-blueMain transition-colors">{asset.ticker}</h3>
                  <p className="text-sm text-evo-textSec">{asset.name}</p>
                </div>
                <div className="font-numbers">
                  <ScoreIndicator score={asset.score} />
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                <span className={`text-sm font-bold ${
                  asset.category === 'Excelente' ? 'text-evo-green' :
                  asset.category === 'Muito Bom' ? 'text-evo-blueMain' : 'text-yellow-500'
                }`}>
                  {asset.category}
                </span>
                <span className="text-xs text-evo-textSec">Nota de exemplo</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
