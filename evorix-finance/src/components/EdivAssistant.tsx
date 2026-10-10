import { useEffect, useRef, useState } from "react";
import {
  Bot,
  BriefcaseBusiness,
  CircleHelp,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { AccountGate } from "./AccountGate";

type AssistantMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  href?: string;
  linkLabel?: string;
};

type LocalAnswer = Omit<AssistantMessage, "id" | "role">;

const suggestions = [
  "Como estudo uma empresa pelo ranking?",
  "O que é diversificação?",
  "Como funciona o ranking?",
  "Qual a diferença entre dividendos e valorização?",
];

function getLocalAnswer(question: string): LocalAnswer {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  if (/diversific|concentracao|risco/.test(normalized))
    return {
      text: "Diversificar é distribuir investimentos entre ativos e fontes de risco diferentes. Isso pode reduzir o impacto de problemas em uma empresa, mas não elimina perdas nem os riscos do mercado. Ter muitos tickers do mesmo setor pode continuar concentrando riscos.",
      href: "/aprender#risco",
      linkLabel: "Entender riscos",
    };
  if (/dividendo|jcp|provento/.test(normalized))
    return {
      text: "Dividendos e JCP são distribuições da empresa. Um pagamento anunciado ainda não é dinheiro recebido. A valorização é a mudança no preço do ativo. Ao estudar uma empresa, observe sua geração de caixa, as datas informadas e a sustentabilidade dos pagamentos; distribuições futuras não são garantidas.",
      href: "/aprender#dividendos",
      linkLabel: "Entender dividendos",
    };
  if (/preco.alvo|potencial|horizonte|tese/.test(normalized))
    return {
      text: "Preço-alvo é uma estimativa baseada em premissas. O potencial compara esse alvo com um preço de referência; não é probabilidade de lucro. Horizonte informa o prazo do cenário. Leia a tese, os riscos e a data, pois mudanças na empresa ou no mercado podem invalidar as premissas.",
      href: "/aprender#ranking",
      linkLabel: "Interpretar uma previsão",
    };
  if (
    /\b(ia|inteligencia artificial|chatgpt|robo|assistente)\b/.test(normalized)
  ) {
    return {
      text: "O guia local usa respostas predefinidas no navegador. Ao selecionar Usar IA e confirmar o aviso, suas perguntas e o histórico recente são enviados ao Google Gemini. Não há acesso automático à sua carteira.",
    };
  }

  if (
    /\b(carteira|investimento|investimentos|compra|venda|operacao|ativo|ativos)\b/.test(
      normalized,
    ) &&
    /\b(como|registr|adicionar|cadastrar|incluir|excluir|apagar|remover|corrigir)\b/.test(
      normalized,
    )
  ) {
    return {
      text: "A Ediv está focada em pesquisa de ações e educação sobre dividendos. A área de carteira não faz parte desta POC. Entre no ranking e abra uma empresa para conhecer sua tese, os riscos e os indicadores publicados.",
      href: "/app/ranking",
      linkLabel: "Abrir ranking de previsões",
    };
  }

  if (
    /\b(cotacao|cotacoes|preco|precos|tempo real|atraso|mercado|bolsa)\b/.test(
      normalized,
    )
  ) {
    return {
      text: "A página Mercado apresenta as cotações retornadas pelo provedor disponível. Confira a fonte e os horários exibidos junto aos dados. Quando não houver preço disponível, o site identifica essa condição.",
      href: "/mercado",
      linkLabel: "Ver mercado",
    };
  }

  if (
    /\b(ranking|renda|previsao|previsoes|projecao|projecoes|crescer|excel|planilha)\b/.test(
      normalized,
    )
  ) {
    return {
      text: "O ranking de previsões mostra projeções publicadas pela equipe a partir de uma planilha. Projeções são estimativas, não garantias de valorização nem recomendações automáticas. Veja a data e as informações de origem apresentadas na página.",
      href: "/ranking",
      linkLabel: "Consultar ranking",
    };
  }

  if (
    /\b(assessoria|corretor|assessor|assinatura|mensalidade|preco|valor|29,?90|atendimento)\b/.test(
      normalized,
    )
  ) {
    return {
      text: "A assessoria está em pré-lançamento. R$ 29,90 por mês é o valor proposto, mas a assinatura ainda não está à venda e esta página não faz cobranças. Os detalhes de atendimento, credenciais e benefícios precisam ser apresentados antes de qualquer contratação.",
      href: "/assessoria",
      linkLabel: "Ver assessoria",
    };
  }

  if (
    /\b(conta|cadastro|cadastrar|registrar|login|entrar|senha|email|e-mail)\b/.test(
      normalized,
    )
  ) {
    return {
      text: "Você pode criar uma conta gratuitamente para acessar o painel e registrar operações manuais. Não informe aqui sua senha, CPF, dados bancários ou credenciais da corretora.",
      href: "/cadastro",
      linkLabel: "Criar conta",
    };
  }

  if (
    /\b(comprar|vender|compro|vendo|vale a pena|recomenda|recomendacao|qual acao|qual ativo|rentabilidade garantida|garantia)\b/.test(
      normalized,
    )
  ) {
    return {
      text: "Não posso avaliar se um ativo é adequado para você nem recomendar compra ou venda. Posso explicar recursos do site e conceitos gerais; decisões de investimento dependem dos seus objetivos, riscos e de orientação profissional apropriada.",
      href: "/mercado",
      linkLabel: "Explorar informações do mercado",
    };
  }

  if (
    /\b(privacidade|dados|salva|armazen|enviado|seguranca)\b/.test(normalized)
  ) {
    return {
      text: "O histórico da Ediv fica na memória temporária desta página. No modo local, a pergunta é processada no navegador. No modo IA, pergunta e histórico recente vão ao Google após sua confirmação. Não envie dados pessoais, carteira ou credenciais.",
    };
  }

  return {
    text: "Ainda não tenho uma resposta local para essa pergunta. Posso explicar riscos, proventos, preços-alvo, carteira, cotações e os recursos da Ediv. Escolha um dos atalhos ou reformule sua dúvida.",
  };
}

export function EdivAssistant() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <EdivAssistantSession key={user?.id || "visitor"} />;
}

function EdivAssistantSession() {
  const { user, refreshSession } = useAuth();
  const location = useLocation();
  const isApp = location.pathname.startsWith("/app");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [accountLimit, setAccountLimit] = useState(20);
  const generative = Boolean(user) && aiEnabled && useAi;
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Olá! Posso explicar funções do site e conceitos financeiros gerais. Não tenho cotações ao vivo nem acesso à sua carteira. Como posso ajudar?",
    },
  ]);
  const nextId = useRef(2);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatController = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => chatController.current?.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/assistant/status", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        if (!controller.signal.aborted) {
          setAiEnabled(status?.enabled === true);
          if (Number.isInteger(status?.accountLimit) && status.accountLimit > 0)
            setAccountLimit(status.accountLimit);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setAiEnabled(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatusLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const prepare = (event: Event) => {
      setDraft(
        String((event as CustomEvent<string>).detail || "").slice(0, 1200),
      );
      setOpen(true);
    };
    window.addEventListener("ediv-assistant-question", prepare);
    return () => window.removeEventListener("ediv-assistant-question", prepare);
  }, []);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    bottomRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "end",
    });
  }, [open, messages]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const ask = async (value: string) => {
    const question = value.trim();
    if (!question || busy || (generative && statusLoading)) return;
    if (generative && !privacyAccepted) {
      setChatError(
        "Leia e confirme o aviso sobre o envio ao Google antes de conversar com a IA.",
      );
      return;
    }
    setChatError("");
    const userMessage: AssistantMessage = {
      id: nextId.current++,
      role: "user",
      text: question,
    };
    if (!generative) {
      const response = getLocalAnswer(question);
      const assistantMessage: AssistantMessage = {
        ...response,
        id: nextId.current++,
        role: "assistant",
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setDraft("");
      return;
    }

    const conversation = [
      ...messages.filter((message) => message.id !== 1),
      userMessage,
    ].slice(-9);
    while (conversation[0]?.role !== "user") conversation.shift();
    while (
      conversation.length > 1 &&
      new TextEncoder().encode(JSON.stringify({ messages: conversation }))
        .byteLength > 14000
    )
      conversation.splice(0, 2);
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setBusy(true);
    const controller = new AbortController();
    chatController.current = controller;
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(35000),
        ]),
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversation.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            text: message.text.slice(0, 1200),
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        setUseAi(false);
        setPrivacyAccepted(false);
        await refreshSession();
      }
      if (!response.ok)
        throw new Error(
          result.error || "Não foi possível obter uma resposta agora.",
        );
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: result.answer },
      ]);
    } catch (reason) {
      if (controller.signal.aborted) return;
      const fallback = getLocalAnswer(question);
      setMessages((current) => [
        ...current,
        {
          ...fallback,
          id: nextId.current++,
          role: "assistant",
          text:
            "Resposta educativa local (a IA não respondeu):\n\n" +
            fallback.text,
        },
      ]);
      setChatError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível obter uma resposta agora.",
      );
    } finally {
      if (chatController.current === controller) {
        setBusy(false);
        chatController.current = null;
      }
    }
  };

  const panelPosition = isApp
    ? "bottom-[9.5rem] lg:bottom-24"
    : "bottom-20 sm:bottom-24";
  const buttonPosition = isApp
    ? "bottom-[5.25rem] lg:bottom-6"
    : "bottom-5 sm:bottom-6";

  return (
    <>
      {open && (
        <section
          id="ediv-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ediv-assistant-title"
          className={`fixed right-3 z-[60] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-evo-border bg-evo-bgSec shadow-2xl shadow-black/50 sm:right-6 ${isApp ? "h-[min(36rem,calc(100dvh-12rem))] lg:h-[min(36rem,calc(100dvh-8rem))]" : "h-[min(36rem,calc(100dvh-8rem))]"} ${panelPosition}`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-evo-border bg-evo-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-evo-green/20 bg-evo-green/10 text-evo-green">
                <Bot size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2
                  id="ediv-assistant-title"
                  className="truncate text-sm font-semibold text-evo-textMain"
                >
                  Aprender com a Ediv
                </h2>
                <p className="mt-0.5 text-xs text-evo-textSec">
                  {statusLoading
                    ? "Carregando assistente…"
                    : generative
                      ? "Gemini · uso experimental"
                      : "Guia educativo · local"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label="Fechar assistente"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-evo-textSec hover:bg-white/5 hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-green"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Conversa de ajuda"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] break-words rounded-2xl px-3.5 py-3 ${message.role === "user" ? "rounded-br-md bg-evo-primary text-evo-textMain" : "rounded-bl-md border border-evo-border bg-evo-card text-evo-textMain"}`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.text}
                  </p>
                  {message.href && message.linkLabel && (
                    <Link
                      to={message.href}
                      onClick={() => setOpen(false)}
                      className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-evo-green/30 px-2.5 text-xs font-semibold text-evo-green transition hover:bg-evo-green/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-green"
                    >
                      <BriefcaseBusiness size={14} aria-hidden="true" />
                      {message.linkLabel}
                    </Link>
                  )}
                </div>
              </article>
            ))}
            {busy && (
              <p role="status" className="text-xs text-evo-textSec">
                Preparando resposta…
              </p>
            )}
            {chatError && (
              <p
                role="alert"
                className="rounded-lg border border-evo-red/25 bg-evo-red/10 p-3 text-xs leading-relaxed text-evo-red"
              >
                {chatError}
              </p>
            )}
            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-evo-textSec">
                  <CircleHelp size={13} aria-hidden="true" /> Perguntas
                  frequentes
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={busy || (generative && !privacyAccepted)}
                      onClick={() => void ask(suggestion)}
                      className="min-h-9 rounded-full border border-evo-border bg-evo-bgMain px-3 text-left text-xs text-evo-textSec transition hover:border-evo-green/40 hover:text-evo-textMain disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-green"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
            className="border-t border-evo-border bg-evo-card p-3"
          >
            {!user && (
              <div className="mb-3">
                <AccountGate
                  compact
                  title="Libere o assistente com IA"
                  description="Use sua conta gratuita para conversar com a IA educativa, conforme os limites e a disponibilidade do provedor. O guia básico continua aberto."
                  next={location.pathname + location.search + location.hash}
                />
              </div>
            )}
            {user && aiEnabled && (
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={!useAi}
                  onClick={() => setUseAi(false)}
                  className="min-h-10 rounded-lg border border-evo-border px-3 text-xs"
                >
                  Guia local
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={useAi}
                  onClick={() => setUseAi(true)}
                  className="min-h-10 rounded-lg border border-evo-border px-3 text-xs"
                >
                  Usar IA
                </button>
              </div>
            )}
            {user && aiEnabled && (
              <p className="mb-3 text-xs text-evo-textSec">
                IA: até {accountLimit} perguntas por conta em 24 horas, sujeitas
                à cota compartilhada do provedor.
              </p>
            )}
            {user && !aiEnabled && !statusLoading && (
              <p className="mb-3 text-xs text-evo-textSec">
                A IA ainda não está disponível. Você pode usar o guia local.
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              className="mb-3 min-h-10 text-xs text-evo-textSec underline"
              onClick={() => {
                setMessages([
                  {
                    id: 1,
                    role: "assistant",
                    text: "Posso explicar conceitos financeiros gerais e funções da Ediv. Não tenho acesso à sua carteira nem a cotações ao vivo.",
                  },
                ]);
                setDraft("");
                setChatError("");
                setPrivacyAccepted(false);
                setUseAi(false);
              }}
            >
              Limpar conversa
            </button>
            {generative && (
              <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-evo-textSec">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => {
                    setPrivacyAccepted(event.target.checked);
                    setChatError("");
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-evo-accent"
                />
                <span>
                  Entendi que a pergunta e o histórico serão enviados ao Google
                  Gemini no plano gratuito, que pode usar esse conteúdo para
                  melhorar serviços e permitir revisão humana. Não enviarei
                  dados pessoais, saldo, carteira ou credenciais.
                </span>
              </label>
            )}
            <label htmlFor="ediv-assistant-input" className="sr-only">
              Sua pergunta
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-evo-border bg-evo-bgMain p-1.5 pl-3 focus-within:border-evo-green/60">
              <input
                ref={inputRef}
                id="ediv-assistant-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1200}
                placeholder="Escreva sua dúvida…"
                autoComplete="off"
                disabled={busy || (generative && statusLoading)}
                className="min-h-10 min-w-0 flex-1 bg-transparent text-base sm:text-sm text-evo-textMain outline-none placeholder:text-evo-textSec"
              />
              <button
                type="submit"
                disabled={
                  !draft.trim() ||
                  busy ||
                  (generative && statusLoading) ||
                  (generative && !privacyAccepted)
                }
                aria-label="Enviar pergunta"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-evo-primary text-evo-textMain transition hover:bg-evo-primaryHover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] leading-relaxed text-evo-textSec">
              Não envie senhas, CPF, dados bancários ou informações da
              corretora.{" "}
              {generative
                ? "A Ediv não guarda este histórico."
                : "As mensagens ficam apenas nesta página."}
            </p>
          </form>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Fechar ajuda da Ediv" : "Abrir ajuda da Ediv"}
        aria-expanded={open}
        aria-controls={open ? "ediv-assistant-panel" : undefined}
        className={`fixed right-4 z-[61] flex h-14 items-center gap-2 rounded-full border border-evo-accent/30 bg-evo-primary px-4 text-sm font-semibold text-evo-textMain shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-evo-primaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent sm:right-6 ${buttonPosition}`}
      >
        {open ? (
          <X size={19} aria-hidden="true" />
        ) : (
          <MessageCircle size={19} aria-hidden="true" />
        )}
        <span>{open ? "Fechar" : "Ajuda"}</span>
      </button>
    </>
  );
}
