import { useAuth } from "../context/authContext";

export function SessionStatus({ embedded = false }: { embedded?: boolean }) {
  const { loading, sessionError, retrySession } = useAuth();
  const Container = embedded ? "section" : "main";
  return (
    <Container
      className={`flex items-center justify-center px-5 text-center ${embedded ? "min-h-[50vh]" : "min-h-screen"}`}
    >
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
    </Container>
  );
}
