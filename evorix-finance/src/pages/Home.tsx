import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useRegistrationAvailability } from "../hooks/useRegistrationAvailability";
import { SessionNotice } from "../components/SessionStatus";
import { PublicHome } from "../components/home/PublicHome";
export { HomeContent } from "../components/home/AccountHomeContent";

export function Home() {
  const { user, sessionError } = useAuth();
  const registration = useRegistrationAvailability();
  const awaitingRegistration = registration.current?.available === false;
  // The public page is static and matches the prerendered HTML. It stays visible
  // while the session is checked or unavailable; only a confirmed account leaves.
  if (user) return <Navigate to="/app" replace />;
  return (
    <>
      {sessionError && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 md:px-8">
          <SessionNotice message="Não foi possível verificar sua conta agora. Você pode continuar explorando a página; tente entrar novamente em instantes." />
        </div>
      )}
      <PublicHome awaitingRegistration={awaitingRegistration} />
    </>
  );
}
