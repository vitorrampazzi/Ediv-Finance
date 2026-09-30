import { useState } from 'react';
import { Save } from 'lucide-react';
import { Card } from '../components/Card';
import { ScoreIndicator } from '../components/ScoreIndicator';
import { mockRecomendados } from '../data/mockData';
import { useAuth } from '../context/authContext';

export const Perfil = () => {
  const { user } = useAuth();
  const [perfilRisco, setPerfilRisco] = useState('Moderado / Crescimento');
  const [salvo, setSalvo] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-evo-textMain">Meu perfil</h2>
        <p className="mt-1 text-evo-textSec">Dados básicos usados para identificar sua conta.</p>
      </div>

      <Card glow="blue" className="max-w-3xl">
        <h3 className="border-b border-evo-border pb-3 text-lg font-semibold">Dados da conta</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-evo-textSec">Nome</dt><dd className="mt-1 break-words font-medium text-evo-textMain">{user?.name}</dd></div>
          <div><dt className="text-xs text-evo-textSec">E-mail</dt><dd className="mt-1 break-all font-medium text-evo-textMain">{user?.email}</dd></div>
          <div><dt className="text-xs text-evo-textSec">Confirmação de e-mail</dt><dd className="mt-1 font-medium text-evo-green">{user?.emailVerified ? 'Confirmado' : 'Pendente'}</dd></div>
        </dl>
      </Card>

      <Card glow="blue" className="max-w-3xl space-y-5">
        <div>
          <h3 className="border-b border-evo-border pb-3 text-lg font-semibold">Preferência demonstrativa</h3>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">A seleção abaixo só altera esta tela. Não é uma avaliação de suitability e não é salva na sua conta.</p>
        </div>
        <div>
          <label htmlFor="perfil-risco" className="mb-1.5 block text-sm font-medium text-evo-textMain">Perfil de exemplo</label>
          <select
            id="perfil-risco"
            value={perfilRisco}
            onChange={(event) => { setPerfilRisco(event.target.value); setSalvo(false); }}
            className="min-h-11 w-full rounded-lg border border-white/10 bg-evo-bgMain px-4 text-evo-textMain focus:border-evo-blueMain"
          >
            <option>Conservador</option>
            <option>Moderado / Crescimento</option>
            <option>Arrojado / Global</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setSalvo(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-evo-blueMain px-5 font-semibold text-white transition-colors hover:bg-evo-blueSec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-blueMain">
            <Save size={18} aria-hidden="true" /> Aplicar nesta tela
          </button>
          {salvo && <span role="status" className="text-sm text-evo-green">Preferência aplicada nesta sessão.</span>}
        </div>
      </Card>

      <Card glow="none">
        <h3 className="mb-1 text-lg font-semibold">Exemplos de ativos</h3>
        <p className="mb-5 text-sm leading-relaxed text-evo-textSec">Esses dados são fictícios e independem da preferência selecionada. Não são recomendações nem uma análise do seu perfil.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {mockRecomendados.map(ativo => (
            <article key={ativo.ticker} className="rounded-xl border border-evo-border bg-evo-bgMain p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-evo-textMain">{ativo.ticker}</h4>
                  <span className="text-xs text-evo-textSec">{ativo.name}</span>
                </div>
                <ScoreIndicator score={ativo.score} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-evo-textSec">{ativo.motivo}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
};
