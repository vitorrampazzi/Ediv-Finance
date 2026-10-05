import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../components/Card";
import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";

export const Perfil = () => {
  const { user } = useAuth();
  const [perfilRisco, setPerfilRisco] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [declaredInvestedAmount, setDeclaredInvestedAmount] = useState("");

  useEffect(() => {
    apiRequest<{
      riskProfile: string | null;
      emailNotifications: boolean;
      whatsappNotifications: boolean;
      declaredInvestedAmount: string | null;
    }>("/api/portfolio/preferences")
      .then((preferences) => {
        if (preferences.riskProfile) setPerfilRisco(preferences.riskProfile);
        setEmailNotifications(preferences.emailNotifications);
        setWhatsappNotifications(preferences.whatsappNotifications);
        setDeclaredInvestedAmount(preferences.declaredInvestedAmount || "");
      })
      .catch((reason) =>
        setErro(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as preferências.",
        ),
      );
  }, []);

  const salvarPreferencias = async () => {
    setSalvando(true);
    setErro("");
    setSalvo(false);
    try {
      await apiRequest("/api/portfolio/preferences", {
        method: "PUT",
        body: JSON.stringify({
          riskProfile: perfilRisco || null,
          emailNotifications,
          whatsappNotifications,
          declaredInvestedAmount: declaredInvestedAmount.trim()
            ? declaredInvestedAmount.replace(",", ".")
            : null,
        }),
      });
      setSalvo(true);
    } catch (reason) {
      setErro(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar as preferências.",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-evo-textMain">
          Meu perfil
        </h2>
        <p className="mt-1 text-evo-textSec">
          Dados básicos usados para identificar sua conta.
        </p>
      </div>

      <Card glow="blue" className="max-w-3xl">
        <h3 className="border-b border-evo-border pb-3 text-lg font-semibold">
          Dados da conta
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-evo-textSec">Nome</dt>
            <dd className="mt-1 break-words font-medium text-evo-textMain">
              {user?.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-evo-textSec">E-mail</dt>
            <dd className="mt-1 break-all font-medium text-evo-textMain">
              {user?.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-evo-textSec">Confirmação de e-mail</dt>
            <dd className="mt-1 font-medium text-evo-green">
              {user?.emailVerified ? "Confirmado" : "Pendente"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card glow="blue" className="max-w-3xl space-y-5">
        <div>
          <h3 className="border-b border-evo-border pb-3 text-lg font-semibold">
            Preferência de risco declarada
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
            Esta preferência é informativa e fica salva na sua conta. Não é uma
            avaliação de suitability nem uma recomendação.
          </p>
        </div>
        <div>
          <label
            htmlFor="perfil-risco"
            className="mb-1.5 block text-sm font-medium text-evo-textMain"
          >
            Como você descreve sua preferência?
          </label>
          <select
            id="perfil-risco"
            value={perfilRisco}
            onChange={(event) => {
              setPerfilRisco(event.target.value);
              setSalvo(false);
            }}
            className="min-h-11 w-full rounded-lg border border-white/10 bg-evo-bgMain px-4 text-evo-textMain focus:border-evo-accent"
          >
            <option value="">Não informado</option>
            <option value="CONSERVADOR">Conservador</option>
            <option value="MODERADO">Moderado</option>
            <option value="ARROJADO">Arrojado</option>
          </select>
        </div>
      </Card>

      <Card glow="none" className="max-w-3xl space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Total investido informado</h3>
          <p className="mt-1 text-sm leading-relaxed text-evo-textSec">
            Opcional. Este valor será exibido como uma informação que você
            declarou e não altera o valor de mercado calculado pelas suas
            posições cadastradas.
          </p>
        </div>
        <label
          htmlFor="declared-invested"
          className="block text-sm font-medium text-evo-textMain"
        >
          Valor em reais
        </label>
        <div className="flex max-w-sm items-center gap-2 rounded-lg border border-evo-border bg-evo-bgMain px-3">
          <span className="text-sm text-evo-textSec">R$</span>
          <input
            id="declared-invested"
            type="number"
            min="0"
            max="9999999999999999.99"
            step="0.01"
            inputMode="decimal"
            value={declaredInvestedAmount}
            onChange={(event) => {
              setDeclaredInvestedAmount(event.target.value);
              setSalvo(false);
            }}
            placeholder="0,00"
            className="min-h-11 w-full bg-transparent text-evo-textMain outline-none"
          />
        </div>
        <p className="text-xs text-evo-textSec">
          Não informe senhas, dados bancários ou credenciais da corretora.
        </p>
      </Card>
      <div className="flex max-w-3xl flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={salvando}
          onClick={salvarPreferencias}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-evo-primary px-5 font-semibold text-white transition-colors hover:bg-evo-primaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evo-accent disabled:opacity-60"
        >
          <Save size={18} aria-hidden="true" />{" "}
          {salvando ? "Salvando…" : "Salvar preferências"}
        </button>
        {salvo && (
          <span role="status" className="text-sm text-evo-green">
            Preferências salvas na sua conta.
          </span>
        )}
        {erro && (
          <span role="alert" className="text-sm text-evo-red">
            {erro}
          </span>
        )}
      </div>
    </div>
  );
};
