import { useAuth } from "../context/authContext";

export function SessionStatus() {
  const { loading, sessionError, retrySession } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center px-5 text-center">
      <div className="max-w-md space-y-4 text-sm text-evo-textSec">
        {loading ? (
          <p role="status">Verificando sua sessão…</p>
        ) : (
          <>
            <p role="alert">{sessionError}</p>
            <button
              type="button"
              onClick={() => void retrySession()}
              className="action mx-auto"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </main>
  );
}
