import { useEffect, useRef, useState } from 'react';
import { Bot, BriefcaseBusiness, CircleHelp, MessageCircle, Send, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type AssistantMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  href?: string;
  linkLabel?: string;
};

type LocalAnswer = Omit<AssistantMessage, 'id' | 'role'>;

const suggestions = [
  'Como registro minha carteira?',
  'As cotações são em tempo real?',
  'Como funciona o ranking?',
  'O que é a assessoria?',
];

function getLocalAnswer(question: string): LocalAnswer {
  const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

  if (/\b(ia|inteligencia artificial|chatgpt|robo|assistente)\b/.test(normalized)) {
    return {
      text: 'Este é um assistente demonstrativo com respostas predefinidas, não uma IA generativa. Sua mensagem é processada nesta página e não é enviada a um serviço de IA.',
    };
  }

  if (/\b(carteira|investimento|investimentos|compra|venda|operacao|ativo|ativos)\b/.test(normalized) && /\b(como|registr|adicionar|cadastrar|incluir|excluir|apagar|remover|corrigir)\b/.test(normalized)) {
    return {
      text: 'No painel, abra Minha carteira para registrar uma compra ou venda manualmente. Esses registros servem para acompanhar sua carteira; o site não se conecta à corretora nem envia ordens. É preciso entrar na conta.',
      href: '/app/carteira',
      linkLabel: 'Abrir minha carteira',
    };
  }

  if (/\b(cotacao|cotacoes|preco|precos|tempo real|atraso|mercado|bolsa)\b/.test(normalized)) {
    return {
      text: 'A página Mercado consulta dados do provedor disponível. Cotações podem ter atraso, indisponibilidade ou divergência; o horário da consulta não garante que seja o horário da negociação. Confira a fonte e os horários exibidos junto aos dados.',
      href: '/mercado',
      linkLabel: 'Ver mercado',
    };
  }

  if (/\b(ranking|renda|previsao|previsoes|projecao|projecoes|crescer|excel|planilha)\b/.test(normalized)) {
    return {
      text: 'A página Renda mostra projeções publicadas pela equipe a partir de uma planilha. Projeções são estimativas, não garantias de valorização nem recomendações automáticas. Veja a data e as informações de origem apresentadas na página.',
      href: '/ranking',
      linkLabel: 'Consultar Renda',
    };
  }

  if (/\b(assessoria|corretor|assessor|assinatura|mensalidade|preco|valor|29,?90|atendimento)\b/.test(normalized)) {
    return {
      text: 'A assessoria está em pré-lançamento. R$ 29,90 por mês é o valor proposto, mas a assinatura ainda não está à venda e esta página não faz cobranças. Os detalhes de atendimento, credenciais e benefícios precisam ser apresentados antes de qualquer contratação.',
      href: '/assessoria',
      linkLabel: 'Ver assessoria',
    };
  }

  if (/\b(conta|cadastro|cadastrar|registrar|login|entrar|senha|email|e-mail)\b/.test(normalized)) {
    return {
      text: 'Você pode criar uma conta gratuitamente para acessar o painel e registrar operações manuais. Não informe aqui sua senha, CPF, dados bancários ou credenciais da corretora.',
      href: '/cadastro',
      linkLabel: 'Criar conta',
    };
  }

  if (/\b(comprar|vender|compro|vendo|vale a pena|recomenda|recomendacao|qual acao|qual ativo|rentabilidade garantida|garantia)\b/.test(normalized)) {
    return {
      text: 'Não posso avaliar se um ativo é adequado para você nem recomendar compra ou venda. Posso explicar recursos do site e conceitos gerais; decisões de investimento dependem dos seus objetivos, riscos e de orientação profissional apropriada.',
      href: '/mercado',
      linkLabel: 'Explorar informações do mercado',
    };
  }

  if (/\b(privacidade|dados|salva|armazen|enviado|seguranca)\b/.test(normalized)) {
    return {
      text: 'Esta conversa demonstrativa fica apenas na memória temporária desta página e é apagada quando você fecha ou atualiza o site. Não envie dados pessoais, financeiros, senhas ou informações da sua corretora pelo chat.',
    };
  }

  return {
    text: 'Ainda não tenho uma resposta predefinida para essa pergunta. Posso ajudar com cadastro, carteira manual, cotações, ranking de renda ou assessoria. Escolha um dos atalhos ou reformule sua dúvida.',
  };
}

export function EdivAssistant() {
  const location = useLocation();
  const isApp = location.pathname.startsWith('/app');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Olá! Sou o assistente demonstrativo da Ediv. Posso explicar como usar o site e responder dúvidas frequentes. Como posso ajudar?',
    },
  ]);
  const nextId = useRef(2);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const ask = (value: string) => {
    const question = value.trim();
    if (!question) return;
    const userMessage: AssistantMessage = { id: nextId.current++, role: 'user', text: question };
    const response = getLocalAnswer(question);
    const assistantMessage: AssistantMessage = { ...response, id: nextId.current++, role: 'assistant' };
    setMessages(current => [...current, userMessage, assistantMessage]);
    setDraft('');
  };

  const panelPosition = isApp
    ? 'bottom-[9.5rem] sm:bottom-24 lg:bottom-24'
    : 'bottom-20 sm:bottom-24';
  const buttonPosition = isApp
    ? 'bottom-[5.25rem] sm:bottom-6 lg:bottom-6'
    : 'bottom-5 sm:bottom-6';

  return (
    <>
      {open && (
        <section
          id="ediv-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ediv-assistant-title"
          className={`fixed right-3 z-[60] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-evo-border bg-evo-bgSec shadow-2xl shadow-black/50 sm:right-6 ${isApp ? 'h-[min(36rem,calc(100dvh-12rem))] sm:h-[min(36rem,calc(100dvh-8rem))]' : 'h-[min(36rem,calc(100dvh-8rem))]'} ${panelPosition}`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-evo-border bg-evo-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-evo-green/20 bg-evo-green/10 text-evo-green"><Bot size={20} aria-hidden="true" /></span>
              <div className="min-w-0">
                <h2 id="ediv-assistant-title" className="truncate text-sm font-semibold text-evo-textMain">Ajuda Ediv</h2>
                <p className="mt-0.5 text-xs text-evo-textSec">Respostas locais · Demonstração</p>
              </div>
            </div>
            <button type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Fechar assistente" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-evo-textSec hover:bg-white/5 hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-green"><X size={18} aria-hidden="true" /></button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversa de ajuda">
            {messages.map(message => (
              <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-3 ${message.role === 'user' ? 'rounded-br-md bg-evo-primary text-evo-textMain' : 'rounded-bl-md border border-evo-border bg-evo-card text-evo-textMain'}`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                  {message.href && message.linkLabel && <Link to={message.href} onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-evo-green/30 px-2.5 text-xs font-semibold text-evo-green transition hover:bg-evo-green/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-green"><BriefcaseBusiness size={14} aria-hidden="true" />{message.linkLabel}</Link>}
                </div>
              </article>
            ))}
            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-evo-textSec"><CircleHelp size={13} aria-hidden="true" /> Perguntas frequentes</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => ask(suggestion)} className="min-h-9 rounded-full border border-evo-border bg-evo-bgMain px-3 text-left text-xs text-evo-textSec transition hover:border-evo-green/40 hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-green">{suggestion}</button>)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={event => { event.preventDefault(); ask(draft); }} className="border-t border-evo-border bg-evo-card p-3">
            <label htmlFor="ediv-assistant-input" className="sr-only">Sua pergunta</label>
            <div className="flex items-center gap-2 rounded-xl border border-evo-border bg-evo-bgMain p-1.5 pl-3 focus-within:border-evo-green/60">
              <input
                ref={inputRef}
                id="ediv-assistant-input"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                maxLength={400}
                placeholder="Escreva sua dúvida…"
                autoComplete="off"
                className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-evo-textMain outline-none placeholder:text-evo-textSec/70"
              />
              <button type="submit" disabled={!draft.trim()} aria-label="Enviar pergunta" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-evo-primary text-evo-textMain transition hover:bg-evo-primaryHover disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
            </div>
            <p className="mt-2 px-1 text-[10px] leading-relaxed text-evo-textSec">Não envie senhas, CPF, dados bancários ou informações da corretora. As mensagens não são salvas.</p>
          </form>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? 'Fechar ajuda da Ediv' : 'Abrir ajuda da Ediv'}
        aria-expanded={open}
        aria-controls={open ? 'ediv-assistant-panel' : undefined}
        className={`fixed right-4 z-[61] flex h-14 items-center gap-2 rounded-full border border-evo-accent/30 bg-evo-primary px-4 text-sm font-semibold text-evo-textMain shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-evo-primaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent sm:right-6 ${buttonPosition}`}
      >
        {open ? <X size={19} aria-hidden="true" /> : <MessageCircle size={19} aria-hidden="true" />}
        <span>{open ? 'Fechar' : 'Ajuda'}</span>
      </button>
    </>
  );
}
