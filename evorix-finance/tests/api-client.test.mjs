// Tests for the shared JSON client in src/lib/api.ts: apiRequest and sessionRequest.
// fetch and AbortSignal.timeout are replaced with fakes that record their arguments.
import test from "node:test";
import assert from "node:assert/strict";
import { apiRequest, sessionRequest, ApiError } from "../src/lib/api.ts";

// Replaces fetch and AbortSignal.timeout with fakes that record their arguments.
// Restores the originals when each test ends.
async function withFakes(respond, run) {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  const calls = [];
  const timeouts = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  AbortSignal.timeout = (ms) => {
    timeouts.push(ms);
    return originalTimeout.call(AbortSignal, ms);
  };
  try {
    return await run({ calls, timeouts });
  } finally {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
  }
}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const CONNECTION_MESSAGE =
  "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.";

test("tempo limite padrão é 45000 ms", async () => {
  await withFakes(
    () => json({ ok: true }),
    async ({ timeouts }) => {
      await apiRequest("/api/x");
      assert.deepEqual(timeouts, [45000]);
    },
  );
});

test("credentials, Accept e Content-Type só com body", async () => {
  await withFakes(
    () => json({}),
    async ({ calls }) => {
      await apiRequest("/api/x");
      assert.equal(calls[0].init.credentials, "same-origin");
      assert.equal(calls[0].init.headers.Accept, "application/json");
      assert.equal("Content-Type" in calls[0].init.headers, false);

      await apiRequest("/api/x", { method: "POST", body: "{}" });
      assert.equal(calls[1].init.headers["Content-Type"], "application/json");
    },
  );
});

test("cabeçalho do chamador sobrescreve o padrão", async () => {
  await withFakes(
    () => json({}),
    async ({ calls }) => {
      await apiRequest("/api/x", { headers: { Accept: "text/plain" } });
      assert.equal(calls[0].init.headers.Accept, "text/plain");
    },
  );
});

test("sinal do chamador já abortado aborta a requisição", async () => {
  await withFakes(
    (_url, init) => {
      if (init.signal.aborted)
        throw new DOMException("aborted", "AbortError");
      return json({});
    },
    async ({ calls }) => {
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(
        apiRequest("/api/x", { signal: controller.signal }),
        { message: CONNECTION_MESSAGE },
      );
      assert.equal(calls[0].init.signal.aborted, true);
    },
  );
});

test("falha de rede vira Error com a mensagem de conexão, não ApiError", async () => {
  await withFakes(
    () => {
      throw new TypeError("network down");
    },
    async () => {
      await assert.rejects(apiRequest("/api/x"), (error) => {
        assert.equal(error instanceof ApiError, false);
        assert.equal(error instanceof Error, true);
        assert.equal(error.message, CONNECTION_MESSAGE);
        return true;
      });
    },
  );
});

test("resposta 204 devolve {}", async () => {
  await withFakes(
    () => new Response(null, { status: 204 }),
    async () => {
      assert.deepEqual(await apiRequest("/api/x"), {});
    },
  );
});

test("erro com error e code no corpo vira ApiError com message, status e code", async () => {
  await withFakes(
    () => json({ error: "Credenciais inválidas.", code: "BAD_LOGIN" }, 401),
    async () => {
      await assert.rejects(apiRequest("/api/x"), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.message, "Credenciais inválidas.");
        assert.equal(error.status, 401);
        assert.equal(error.code, "BAD_LOGIN");
        return true;
      });
    },
  );
});

test("erro sem corpo JSON usa a mensagem padrão de 429, 503 e demais", async () => {
  const cases = [
    [429, "Muitas solicitações. Aguarde alguns instantes antes de tentar novamente."],
    [503, "O serviço está ocupado. Tente novamente em instantes."],
    [500, "Não foi possível concluir a solicitação. Tente novamente."],
  ];
  for (const [status, message] of cases) {
    await withFakes(
      () => new Response("texto simples", { status }),
      async () => {
        await assert.rejects(apiRequest("/api/x"), (error) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, status);
          assert.equal(error.message, message);
          assert.equal(error.code, undefined);
          return true;
        });
      },
    );
  }
});

test("Retry-After em segundos vira milissegundos", async () => {
  await withFakes(
    () => json({ error: "Espere." }, 429, { "Retry-After": "3" }),
    async () => {
      await assert.rejects(apiRequest("/api/x"), (error) => {
        assert.equal(error.retryAfterMs, 3000);
        return true;
      });
    },
  );
});

test("Retry-After em data HTTP devolve valor não negativo", async () => {
  const future = new Date(Date.now() + 60000).toUTCString();
  const past = new Date(Date.now() - 60000).toUTCString();
  await withFakes(
    () => json({ error: "Espere." }, 429, { "Retry-After": future }),
    async () => {
      await assert.rejects(apiRequest("/api/x"), (error) => {
        assert.ok(error.retryAfterMs > 0 && error.retryAfterMs <= 60000);
        return true;
      });
    },
  );
  await withFakes(
    () => json({ error: "Espere." }, 429, { "Retry-After": past }),
    async () => {
      await assert.rejects(apiRequest("/api/x"), (error) => {
        assert.equal(error.retryAfterMs, 0);
        return true;
      });
    },
  );
});

test("sem Retry-After, retryAfterMs é undefined", async () => {
  await withFakes(
    () => json({ error: "Espere." }, 429),
    async () => {
      await assert.rejects(apiRequest("/api/x"), (error) => {
        assert.equal(error.retryAfterMs, undefined);
        return true;
      });
    },
  );
});

test("opção timeoutMs muda o tempo limite para o valor pedido", async () => {
  await withFakes(
    () => json({}),
    async ({ timeouts }) => {
      await apiRequest("/api/x", {}, { timeoutMs: 30000 });
      assert.deepEqual(timeouts, [30000]);
    },
  );
});

test("sem a opção, as chamadas continuam em 45000 ms", async () => {
  await withFakes(
    () => json({}),
    async ({ timeouts }) => {
      await apiRequest("/api/x", {}, {});
      await apiRequest("/api/x");
      assert.deepEqual(timeouts, [45000, 45000]);
    },
  );
});

test("cache: no-store passado em init chega ao fetch", async () => {
  await withFakes(
    () => json({}),
    async ({ calls }) => {
      await apiRequest("/api/x", { cache: "no-store" }, { timeoutMs: 30000 });
      assert.equal(calls[0].init.cache, "no-store");
    },
  );
});

test("sessionRequest usa tempo limite de 30000 ms, não 45000", async () => {
  await withFakes(
    () => json({}),
    async ({ timeouts }) => {
      await sessionRequest("/api/auth/me");
      assert.deepEqual(timeouts, [30000]);
    },
  );
});

test("sessionRequest envia cache: no-store ao fetch", async () => {
  await withFakes(
    () => json({}),
    async ({ calls }) => {
      await sessionRequest("/api/auth/me");
      assert.equal(calls[0].init.cache, "no-store");
    },
  );
});

test("init.cache do chamador não sobrescreve o no-store de sessionRequest", async () => {
  await withFakes(
    () => json({}),
    async ({ calls }) => {
      await sessionRequest("/api/auth/me", { cache: "force-cache" });
      assert.equal(calls[0].init.cache, "no-store");
    },
  );
});

test("apiRequest sem cache do chamador não envia cache ao fetch", async () => {
  await withFakes(
    () => json({}),
    async ({ calls }) => {
      await apiRequest("/api/x");
      assert.equal(calls[0].init.cache, undefined);
    },
  );
});
