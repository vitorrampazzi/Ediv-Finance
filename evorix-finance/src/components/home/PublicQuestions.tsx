import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import "./public-sections.css";

export function PublicQuestions() {
  return (
    <section className="ph-section ph-faq" aria-labelledby="ph-faq-title">
      <div className="ph-container ph-faq-layout">
        <header data-ph-reveal>
          <p className="edition-label">Dúvidas frequentes</p>
          <h2 id="ph-faq-title" className="display-title ph-section-title">
            Como funciona o acesso.
          </h2>
          <Link className="ph-inline-link" to="/suporte">
            Outras dúvidas
          </Link>
        </header>
        <div className="ph-faq-list" data-ph-reveal>
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
              O que é o ranking de previsões?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                É a lista de cenários publicados pela equipe. Cada pesquisa pode
                reunir potencial, preço-alvo, prazo, tese e riscos, além de
                dados sobre a empresa. Abra uma empresa para ler os detalhes.
              </p>
            </div>
          </details>
          <details className="ph-faq-item">
            <summary>
              As empresas do exemplo são reais?
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="ph-faq-expand">
              <p>
                Não. O caderno de exemplo usa empresas e números fictícios para
                apresentar o formato das pesquisas. Ele aparece com o rótulo
                “Demonstração · dados fictícios”. As pesquisas publicadas pela
                equipe são apresentadas separadamente no ranking.
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
