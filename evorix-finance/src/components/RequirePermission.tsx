import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { userCan } from "../lib/permissions";
export function RequirePermission({ permission }: { permission: string }) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Conferindo acesso…</p>;
  if (!userCan(user, permission))
    return (
      <section className="space-y-4 rounded-xl border border-evo-border bg-evo-card p-6">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p>Sua conta não tem permissão para acessar esta área.</p>
        <Link className="text-evo-accent underline" to="/app">
          Voltar ao início
        </Link>
      </section>
    );
  return <Outlet key={user?.id} />;
}
