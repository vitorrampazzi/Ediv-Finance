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

/**
 * Non-blocking session notice: public pages and account forms stay usable while
 * the session check is unavailable. Renders nothing when there is no error.
 */
export function SessionNotice({
  className = "",
  message,
}: {
  className?: string;
  message?: string;
}) {
  const { user, loading, sessionError, retrySession } = useAuth();
  if (user || !sessionError) return null;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-evo-border bg-evo-card px-4 py-3 text-sm text-evo-textSec ${className}`}
    >
      <p className="min-w-0 flex-1 basis-60">{message || sessionError}</p>
      <button
        type="button"
        aria-disabled={loading || undefined}
        onClick={() => {
          if (!loading) void retrySession();
        }}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-evo-accent underline underline-offset-4 aria-disabled:cursor-wait aria-disabled:opacity-60"
      >
        {loading ? "Verificando…" : "Tentar novamente"}
      </button>
    </div>
  );
}
