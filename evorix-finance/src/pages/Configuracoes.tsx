// src/pages/Configuracoes.tsx
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Card } from '../components/Card';
import { Cpu, Shield, Bell, LockKeyhole, Trash2, TriangleAlert } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';

export const Configuracoes = () => {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('motor');

  const [config, setConfig] = useState({
    notifEmail: false,
    notifWhatsapp: false,
    motorAggressiveness: 75,
  });
  const [riskProfile, setRiskProfile] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmation, setAccountConfirmation] = useState('');
  const [accountDeleteError, setAccountDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    apiRequest<{ riskProfile: string | null; emailNotifications: boolean; whatsappNotifications: boolean }>('/api/portfolio/preferences')
      .then(preferences => {
        setRiskProfile(preferences.riskProfile);
        setConfig(current => ({ ...current, notifEmail: preferences.emailNotifications, notifWhatsapp: preferences.whatsappNotifications }));
      })
      .catch(reason => setErro(reason instanceof Error ? reason.message : 'Não foi possível carregar as preferências.'));
  }, []);

  const saveNotificationPreferences = async (notifEmail: boolean, notifWhatsapp: boolean) => {
    setErro(''); setStatus('');
    try {
      await apiRequest('/api/portfolio/preferences', {
        method: 'PUT',
        body: JSON.stringify({ riskProfile, emailNotifications: notifEmail, whatsappNotifications: notifWhatsapp }),
      });
      setStatus('Preferências salvas. Esta versão ainda não envia notificações.');
    } catch (reason) {
      setErro(reason instanceof Error ? reason.message : 'Não foi possível salvar as preferências.');
    }
  };

  const confirmAccountDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountDeleteError('');
    setDeletingAccount(true);
    try {
      await deleteAccount(accountPassword);
      navigate('/', { replace: true });
    } catch (reason) {
      setAccountDeleteError(reason instanceof Error ? reason.message : 'Não foi possível excluir a conta. Tente novamente.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-evo-textMain tracking-tight">Configurações</h1>
        <p className="text-evo-textSec mt-1">Preferências salvas na sua conta. Recursos de integração externa ainda não estão conectados.</p>
      </div>

      {erro && <p role="alert" className="rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red">{erro}</p>}
      {status && <p role="status" className="rounded-lg border border-evo-green/20 bg-evo-green/5 p-3 text-sm text-evo-green">{status}</p>}

      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        <TabBtn ativo={abaAtiva === 'motor'} onClick={() => setAbaAtiva('motor')} icon={<Cpu size={16} />} text="Motor Quantitativo" />
        <TabBtn ativo={abaAtiva === 'seguranca'} onClick={() => setAbaAtiva('seguranca')} icon={<Shield size={16} />} text="Segurança & API" />
        <TabBtn ativo={abaAtiva === 'notificacoes'} onClick={() => setAbaAtiva('notificacoes')} icon={<Bell size={16} />} text="Notificações" />
      </div>

      {abaAtiva === 'motor' && (
        <Card glow="blue" className="space-y-6 max-w-3xl">
          <div>
            <h3 className="text-lg font-semibold">Parâmetros do Motor Quantitativo</h3>
            <p className="text-sm text-evo-textSec mt-1">Controle visual para demonstrar uma preferência; não altera análises, scores ou ativos.</p>
          </div>

          <div className="bg-evo-bgMain p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-evo-textMain">Agressividade do Algoritmo (Peso de Risco)</span>
              <label htmlFor="risk-weight" className="font-numbers font-bold text-evo-blueMain">{config.motorAggressiveness}%</label>
            </div>
            <input
              type="range"
              id="risk-weight"
              aria-label="Peso ilustrativo do indicador de risco"
              min="10"
              max="100"
              value={config.motorAggressiveness}
              onChange={(e) => setConfig({ ...config, motorAggressiveness: Number(e.target.value) })}
              className="w-full accent-evo-blueMain cursor-pointer"
            />
            <p className="text-xs leading-relaxed text-evo-textSec">Este controle é apenas visual e não representa uma estratégia de investimento.</p>
          </div>
        </Card>
      )}

      {abaAtiva === 'seguranca' && (
        <Card glow="none" className="max-w-3xl space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Integrações indisponíveis</h3>
            <p className="mt-1 text-sm text-evo-textSec">Este ambiente não possui API, conexão com corretora nem credenciais configuradas.</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-evo-green/20 bg-evo-green/[0.04] p-4">
            <LockKeyhole size={18} className="mt-0.5 shrink-0 text-evo-green" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-evo-textSec">Não informe senhas, chaves privadas, tokens ou dados da sua corretora neste protótipo. Uma integração real deve usar armazenamento seguro no servidor.</p>
          </div>
        </Card>
      )}

      {abaAtiva === 'notificacoes' && (
        <Card glow="none" className="space-y-4 max-w-3xl">
          <div className="border-b border-evo-border pb-3">
            <h3 className="text-lg font-semibold">Preferências de exemplo</h3>
            <p className="mt-1 text-xs text-evo-textSec">As preferências ficam salvas na conta. Nenhuma mensagem é enviada nesta versão.</p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <h4 id="email-notifications-label" className="font-medium text-evo-textMain">Exemplo de alertas por e-mail</h4>
              <p className="text-xs text-evo-textSec">Controle visual sem envio de e-mails.</p>
            </div>
            <input
              type="checkbox"
              aria-labelledby="email-notifications-label"
              checked={config.notifEmail}
              onChange={(e) => { const enabled = e.target.checked; setConfig(current => ({ ...current, notifEmail: enabled })); void saveNotificationPreferences(enabled, config.notifWhatsapp); }}
              className="w-5 h-5 accent-evo-blueMain cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <div>
              <h4 id="whatsapp-notifications-label" className="font-medium text-evo-textMain">Exemplo de resumo por WhatsApp</h4>
              <p className="text-xs text-evo-textSec">Controle visual sem conexão com o WhatsApp.</p>
            </div>
            <input
              type="checkbox"
              aria-labelledby="whatsapp-notifications-label"
              checked={config.notifWhatsapp}
              onChange={(e) => { const enabled = e.target.checked; setConfig(current => ({ ...current, notifWhatsapp: enabled })); void saveNotificationPreferences(config.notifEmail, enabled); }}
              className="w-5 h-5 accent-evo-blueMain cursor-pointer"
            />
          </div>
        </Card>
      )}

      <Card glow="none" className="max-w-3xl space-y-4 border border-evo-red/30">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evo-red/10 text-evo-red"><TriangleAlert size={20} aria-hidden="true" /></span>
          <div><h3 className="text-lg font-semibold text-evo-textMain">Zona de atenção</h3><p className="mt-1 text-sm leading-relaxed text-evo-textSec">Você pode apagar sua conta. A exclusão remove permanentemente seu perfil, operações, favoritos e preferências salvas.</p></div>
        </div>
        {!accountDeleteOpen ? (
          <button type="button" onClick={() => { setAccountDeleteOpen(true); setAccountDeleteError(''); }} aria-expanded={accountDeleteOpen} aria-controls="delete-account-form" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-evo-red/40 px-4 text-sm font-medium text-evo-red transition hover:bg-evo-red/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-red"><Trash2 size={16} aria-hidden="true" /> Excluir minha conta</button>
        ) : (
          <form id="delete-account-form" onSubmit={confirmAccountDeletion} className="space-y-4 rounded-xl border border-evo-red/20 bg-evo-red/[0.04] p-4" aria-label="Confirmação de exclusão da conta">
            <p className="text-sm font-medium text-evo-textMain">Essa ação é permanente e não pode ser desfeita. Para confirmar, informe sua senha e digite <strong>EXCLUIR</strong>.</p>
            <label htmlFor="delete-account-password" className="block text-sm text-evo-textSec">Senha atual<input id="delete-account-password" type="password" autoComplete="current-password" required maxLength={128} value={accountPassword} onChange={event => setAccountPassword(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain" /></label>
            <label htmlFor="delete-account-confirmation" className="block text-sm text-evo-textSec">Digite EXCLUIR para confirmar<input id="delete-account-confirmation" required value={accountConfirmation} onChange={event => setAccountConfirmation(event.target.value.toUpperCase())} className="mt-1 block min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 text-evo-textMain" /></label>
            {accountDeleteError && <p role="alert" className="text-sm text-evo-red">{accountDeleteError}</p>}
            <div className="flex flex-wrap gap-3"><button type="button" disabled={deletingAccount} onClick={() => { setAccountDeleteOpen(false); setAccountPassword(''); setAccountConfirmation(''); setAccountDeleteError(''); }} className="min-h-10 rounded-lg border border-evo-border px-4 text-sm text-evo-textSec hover:bg-white/5 disabled:opacity-50">Cancelar</button><button type="submit" disabled={deletingAccount || !accountPassword || accountConfirmation !== 'EXCLUIR'} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-evo-red px-4 text-sm font-semibold text-white hover:bg-evo-red/80 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={15} aria-hidden="true" />{deletingAccount ? 'Excluindo conta…' : 'Excluir conta permanentemente'}</button></div>
          </form>
        )}
      </Card>
    </div>
  );
};

interface TabBtnProps {
  ativo: boolean;
  onClick: () => void;
  icon: ReactNode;
  text: string;
}

const TabBtn = ({ ativo, onClick, icon, text }: TabBtnProps) => (
  <button
    type="button"
    aria-pressed={ativo}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      ativo
      ? 'bg-evo-blueMain/20 text-evo-blueMain border border-evo-blueMain/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
      : 'text-evo-textSec hover:bg-white/[0.02] hover:text-evo-textMain border border-transparent'
    }`}
  >
    {icon}
    {text}
  </button>
);
