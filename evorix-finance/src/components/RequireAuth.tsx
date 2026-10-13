import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { SessionStatus } from "./SessionStatus";

export function RequireAuth() {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();

  if (loading || (!user && sessionError)) return <SessionStatus />;

  if (!user)
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  return <Outlet />;
}
