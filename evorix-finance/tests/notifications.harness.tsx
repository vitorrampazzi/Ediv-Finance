import { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../src/context/authContext";
import type { AuthUser } from "../src/context/AuthProvider";
import { NotificationsMenu } from "../src/components/NotificationsMenu";
import "../src/index.css";

export function Harness() {
  const [account, setAccount] = useState<string | null>("a");
  const refreshSession = useCallback(async () => {}, []);
  const auth = useMemo(() => ({
    user: account ? {
      id: account, name: account, email: `${account}@ediv.test`,
      emailVerified: true, createdAt: "2026-01-01T00:00:00Z", role: "USER", permissions: [],
    } as AuthUser : null,
    loading: false, sessionError: "", refreshSession, retrySession: refreshSession,
    login: async () => { setAccount("b"); },
    logout: async () => { setAccount(null); },
    deleteAccount: refreshSession,
    register: async () => ({}), resendVerification: async () => ({}),
  }), [account, refreshSession]);
  return (
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/app"]}>
        <button onClick={() => setAccount(null)}>QA logout</button>
        <button onClick={() => setAccount("b")}>QA conta B</button>
        <header className="ediv-account-header flex h-20 w-full items-center justify-end p-4">
          {account && <NotificationsMenu />}
        </header>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
