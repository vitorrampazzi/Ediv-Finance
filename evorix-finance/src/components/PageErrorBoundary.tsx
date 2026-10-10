import { Component } from "react";
import type { ContextType, ReactNode } from "react";
import { AuthContext } from "../context/authContext";

export class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  static contextType = AuthContext;
  declare context: ContextType<typeof AuthContext>;
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-lg space-y-4 px-5 py-16">
          <h1 className="text-2xl font-bold">
            Não foi possível abrir esta página
          </h1>
          <p className="text-sm text-evo-textSec">
            Uma atualização ou falha de carregamento pode ter interrompido a
            página. Recarregue para tentar novamente.
          </p>
          <button className="action" onClick={() => window.location.reload()}>
            Recarregar
          </button>
          <a
            href={this.context?.user ? "/app" : "/"}
            className="ml-4 text-sm underline"
          >
            Voltar ao início
          </a>
        </main>
      );
    return this.props.children;
  }
}
