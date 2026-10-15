import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useRegistrationAvailability } from "../hooks/useRegistrationAvailability";
import { SessionStatus } from "../components/SessionStatus";
import { PublicHome } from "../components/home/PublicHome";
export { HomeContent } from "../components/home/AccountHomeContent";

export function Home() {
  const { user, loading, sessionError } = useAuth();
  const registration = useRegistrationAvailability();
  const awaitingRegistration = registration.current?.available === false;
  if (loading || (!user && sessionError)) return <SessionStatus embedded />;
  if (user) return <Navigate to="/app" replace />;
  return <PublicHome awaitingRegistration={awaitingRegistration} />;
}
