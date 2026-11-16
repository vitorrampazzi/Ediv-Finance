import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import "./public-sections.css";

// Counts which question is opened, by its position in the list.
function trackQuestion(event: MouseEvent<HTMLDivElement>) {
  const item = (event.target as Element).closest("summary")?.closest("details");
  if (!item || item.open) return;
  const position = [...event.currentTarget.children].indexOf(item) + 1;
  trackEvent("open_faq", { faq_position: position });
}

export function PublicQuestions() {
  return (
    <section className="ph-section ph-faq" aria-labelledby="ph-faq-title">
      <div className="ph-container ph-faq-layout">
        <header data-ph-reveal>
          <p className="edition-label">Dúvidas frequentes</p>
          <h2 id="ph-faq-title" className="display-title ph-section-title">
            Como funciona o acesso.
          </h2>
          <Link
            className="ph-inline-link"
            to="/suporte"
            onClick={() =>
              trackEvent("click_content", {
                content_name: "contact",
                content_location: "faq",
              })
            }
          >
            Fale conosco
          </Link>
        </header>
        <div className="ph-faq-list" data-ph-reveal onClick={trackQuestion}>
          <details className="ph-faq-item">
            <summary>
              A Escola do Dividendo é uma corretora?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                Não. Você encontra pesquisas de ações e aulas sobre dividendos.
                Não há compra ou venda de ações dentro da Escola do Dividendo.
              </p>
            </div>
          </details>
          <details className="ph-faq-item">
            <summary>
              O acesso é gratuito?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                A primeira aula é aberta. Uma conta gratuita com e-mail
                confirmado libera as pesquisas e a continuação da trilha de
                aprendizado. Não há cobrança habilitada nesta versão.
              </p>
            </div>
          </details>
          <details className="ph-faq-item">
            <summary>
              O que é o Ranking de Ações?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                É a lista de empresas da publicação mais recente da equipe, na
                ordem original da pesquisa. DY e P/L são os da planilha; a
                margem de segurança acompanha a cotação da brapi.dev.
              </p>
            </div>
          </details>
          <details className="ph-faq-item">
            <summary>
              As empresas do ranking são reais?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                Sim. A home mostra as empresas e os indicadores da pesquisa
                publicada pela equipe. DY e P/L refletem a data da planilha; a
                margem de segurança usa a cotação da brapi.dev. Abra uma empresa
                para acessar a análise completa com sua conta.
              </p>
            </div>
          </details>
          <details className="ph-faq-item">
            <summary>
              O que acontece com meus dados?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                O cadastro usa nome, e-mail e senha para criar sua conta. Ela
                também guarda o progresso das aulas. Você pode solicitar a
                exclusão da conta nas configurações. Leia os detalhes na{" "}
                <Link to="/privacidade">política de privacidade</Link>.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
