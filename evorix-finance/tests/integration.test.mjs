import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";
const fixture = await createFixture();
const { accounts, pool, request, password, state } = fixture;
const { admin, analyst, a, b } = accounts;
const op = {
  side: "BUY",
  ticker: "PETR4",
  assetName: "Empresa de teste",
  assetType: "ACAO",
  quantity: "10",
  unitPrice: "10",
  fees: "0",
  tradedAt: "2026-01-01",
};
const csv =
  "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses;tese;riscos\nPETR4;Empresa A;20;12;12;Tese;Risco\nITUB4;Empresa B;10;22;6;Outra tese;Outro risco";
const meta = encodeURIComponent(
  JSON.stringify({ title: "Pesquisa de teste", authorName: "Autor fictício" }),
);
const upload = (raw = csv) => ({
  method: "POST",
  raw,
  headers: {
    "Content-Type": "text/csv",
    "X-Publication-Meta": meta,
    "X-File-Name": "pesquisa.csv",
  },
});
let first, second, thread, draftId;
try {
  await test("API real e MySQL em schema isolado", async (t) => {
    await t.test("visitantes e origens externas são bloqueados", async () => {
      for (const path of [
        "/api/portfolio",
        "/api/rankings",
        "/api/support/team",
        "/api/admin/users",
        "/api/rankings/drafts",
        "/api/notifications",
      ])
        assert.equal((await request(null, path)).status, 401, path);
      assert.equal(
        (
          await request(a, "/api/support", {
            method: "POST",
            originHeader: "https://outside.test",
            body: { subject: "Assunto", body: "Mensagem" },
          })
        ).status,
        403,
      );
    });
    await t.test(
      "cadastro exige confirmação e não aceita perfil privilegiado",
      async () => {
        assert.equal(
          (
            await request(null, "/api/auth/register", {
              method: "POST",
              body: {
                name: "Teste",
                email: "role@ediv.test",
                password,
                role: "ADMIN",
              },
            })
          ).status,
          400,
        );
        const account = { email: "new@ediv.test", password, cookie: "" };
        const result = await request(account, "/api/auth/register", {
          method: "POST",
          body: { name: "Novo teste", email: account.email, password },
        });
        assert.equal(result.status, 202);
        assert.ok(result.body.verificationUrl);
        assert.equal(
          (
            await request(account, "/api/auth/login", {
              method: "POST",
              body: { email: account.email, password },
            })
          ).status,
          401,
        );
        const token = new URL(result.body.verificationUrl).hash.slice(1);
        assert.equal(
          (
            await request(account, "/api/auth/verify-email", {
              method: "POST",
              body: { token },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(account, "/api/auth/verify-email", {
              method: "POST",
              body: { token },
            })
          ).status,
          400,
        );
        const login = await request(account, "/api/auth/login", {
          method: "POST",
          body: { email: account.email, password },
        });
        assert.equal(login.status, 200);
        assert.equal(login.body.user.role, "USER");
        assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
        assert.match(login.headers.get("set-cookie"), /SameSite=Strict/i);
      },
    );
    await fixture.clearLimits();
    await t.test(
      "Usuário e Analista não administram contas; Usuário não atende",
      async () => {
        for (const person of [a, analyst])
          assert.equal((await request(person, "/api/admin/users")).status, 403);
        assert.equal((await request(a, "/api/support/team")).status, 403);
        assert.equal(
          (await request(a, "/api/rankings/preview", upload())).status,
          403,
        );
        const users = await request(admin, "/api/admin/users?q=qa-");
        assert.equal(users.status, 200);
        assert.ok(users.body.users.length >= 4);
        assert.ok(
          users.body.users.every(
            (u) => !("password_hash" in u) && !("password" in u),
          ),
        );
      },
    );
    await t.test(
      "operações: cálculo, correção, exclusão e isolamento",
      async () => {
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions", {
              method: "POST",
              body: op,
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions", {
              method: "POST",
              body: {
                ...op,
                side: "SELL",
                quantity: "4",
                unitPrice: "12",
                tradedAt: "2026-01-02",
              },
            })
          ).status,
          201,
        );
        let result = await request(a, "/api/portfolio");
        assert.equal(result.body.positions[0].quantity, "6.00000000");
        assert.equal(result.body.summary.realizedPnl, "8.00000000");
        const [rows] = await pool.execute(
          "SELECT id,side FROM portfolio_transactions WHERE user_id=?",
          [a.id],
        );
        const buy = rows.find((r) => r.side === "BUY").id;
        const sell = rows.find((r) => r.side === "SELL").id;
        assert.equal(
          (
            await request(b, "/api/portfolio/transactions/" + buy, {
              method: "DELETE",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions/" + buy, {
              method: "PUT",
              body: { ...op, quantity: "3" },
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions/" + buy, {
              method: "DELETE",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions/" + sell, {
              method: "DELETE",
            })
          ).status,
          204,
        );
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions/" + buy, {
              method: "PUT",
              body: { ...op, quantity: "12", fees: "1" },
            })
          ).status,
          200,
        );
        assert.equal(
          (await request(a, "/api/portfolio")).body.positions[0].costBasis,
          "121.00000000",
        );
        assert.equal(
          (
            await request(a, "/api/portfolio/transactions/" + buy, {
              method: "DELETE",
            })
          ).status,
          204,
        );
        assert.equal(
          (await request(a, "/api/portfolio")).body.positions.length,
          0,
        );
        await request(a, "/api/portfolio/transactions", {
          method: "POST",
          body: op,
        });
        await request(a, "/api/portfolio/transactions", {
          method: "POST",
          body: { ...op, ticker: "NOQUOTE3" },
        });
        result = await request(a, "/api/portfolio");
        assert.equal(
          result.body.positions.find((p) => p.ticker === "NOQUOTE3")
            .marketValue,
          null,
        );
        assert.equal(
          (await request(b, "/api/portfolio")).body.positions.length,
          0,
        );
      },
    );
    await t.test(
      "atendimento: equipe, conversas privadas e consentimento",
      async () => {
        const created = await request(a, "/api/support", {
          method: "POST",
          body: {
            subject: "Pergunta de teste",
            body: "Como funciona?",
            sharePortfolio: false,
          },
        });
        assert.equal(created.status, 201);
        thread = created.body.id;
        assert.equal((await request(b, "/api/support/" + thread)).status, 404);
        assert.equal(
          (await request(analyst, "/api/support/" + thread)).status,
          404,
        );
        assert.equal(
          (await request(analyst, "/api/support/team/" + thread)).body
            .portfolio,
          null,
        );
        assert.equal(
          (
            await request(a, "/api/support/team/" + thread + "/messages", {
              method: "POST",
              body: { body: "Resposta" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(a, "/api/support/" + thread + "/messages", {
              method: "POST",
              body: { body: "Mensagem", status: "ANSWERED" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              analyst,
              "/api/support/team/" + thread + "/messages",
              {
                method: "POST",
                body: { body: "Resposta da equipe", status: "ANSWERED" },
              },
            )
          ).status,
          201,
        );
        assert.equal(
          (await request(a, "/api/support/" + thread)).body.messages.at(-1)
            .is_staff,
          1,
        );
        await request(a, "/api/support/" + thread + "/consent", {
          method: "PATCH",
          body: { sharePortfolio: true },
        });
        assert.ok(
          (await request(analyst, "/api/support/team/" + thread)).body.portfolio
            .length > 0,
        );
        await request(a, "/api/support/" + thread + "/consent", {
          method: "PATCH",
          body: { sharePortfolio: false },
        });
        assert.equal(
          (await request(analyst, "/api/support/team/" + thread)).body
            .portfolio,
          null,
        );
      },
    );
    await t.test(
      "prévia não publica; versões e comparação preservam dados",
      async () => {
        assert.equal(
          (
            await request(
              analyst,
              "/api/rankings/preview",
              upload(csv + "\nPETR4;Repetida;10"),
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              analyst,
              "/api/rankings/preview",
              upload(csv.replace(";20;12;", ";erro;12;")),
            )
          ).status,
          400,
        );
        assert.equal(
          (await request(analyst, "/api/rankings/preview", upload())).status,
          200,
        );
        assert.equal(
          (await request(a, "/api/rankings")).body.entries.length,
          0,
        );
        const created = await request(analyst, "/api/rankings", upload());
        assert.equal(created.status, 201);
        first = created.body.publicationId;
        await request(a, "/api/favorites/PETR4", { method: "PUT" });
        const next = await request(
          analyst,
          "/api/rankings",
          upload(
            csv
              .replace(";20;12;", ";30;13;")
              .split("\n")
              .slice(0, 2)
              .join("\n"),
          ),
        );
        assert.equal(next.status, 201);
        second = next.body.publicationId;
        const diff = await request(
          a,
          `/api/rankings/compare?from=${first}&to=${second}`,
        );
        assert.equal(diff.status, 200);
        assert.equal(diff.body.removed[0].ticker, "ITUB4");
        assert.ok(diff.body.changed[0].fields.includes("targetPrice"));
        assert.equal(
          (await request(a, "/api/rankings?publication=" + first)).body.entries
            .length,
          2,
        );
        assert.equal(
          (
            await request(
              a,
              "/api/rankings/compare?from=" + second + "&to=" + first,
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      "notificações e leitura ficam isoladas por conta",
      async () => {
        const n = await request(a, "/api/notifications");
        assert.equal(n.status, 200);
        assert.equal(n.body.unreadCount, 2);
        assert.ok(n.body.notifications[0].favoriteTickers.includes("PETR4"));
        await request(a, "/api/notifications/read", {
          method: "POST",
          body: { publicationId: second },
        });
        assert.equal(
          (await request(a, "/api/notifications")).body.unreadCount,
          1,
        );
        assert.equal(
          (await request(b, "/api/notifications")).body.unreadCount,
          2,
        );
        await request(a, "/api/notifications/read-all", { method: "POST" });
        assert.equal(
          (await request(a, "/api/notifications")).body.unreadCount,
          0,
        );
      },
    );
    await t.test(
      "rascunho privado, persistência e conflito entre janelas",
      async () => {
        const keys = [
          "ticker",
          "empresa",
          "potencial_percentual",
          "preco_alvo",
          "horizonte_meses",
          "setor",
          "tese",
          "riscos",
          "balanco_patrimonial",
          "dre",
          "fluxo_de_caixa",
          "informacoes_da_empresa",
          "divida_liquida",
          "estatisticas",
          "periodo_referencia",
          "fonte_dados",
        ];
        const row = Object.fromEntries(keys.map((k) => [k, ""]));
        const payload = {
          metadata: {
            title: "Rascunho privado",
            authorName: "",
            professionalCategory: "",
            professionalRegistration: "",
          },
          entries: [],
          working: {
            ...row,
            ticker: "PETR4",
            balanco_patrimonial: "A".repeat(5000),
            dre: "B".repeat(5000),
            fluxo_de_caixa: "C".repeat(5000),
            divida_liquida: "D".repeat(5000),
          },
          editing: null,
        };
        assert.equal(
          (
            await request(a, "/api/rankings/drafts", {
              method: "POST",
              body: { payload },
            })
          ).status,
          403,
        );
        const created = await request(analyst, "/api/rankings/drafts", {
          method: "POST",
          body: { payload },
        });
        assert.equal(created.status, 201);
        draftId = created.body.id;
        assert.equal(
          (await request(admin, "/api/rankings/drafts/" + draftId)).status,
          404,
        );
        assert.equal(
          (await request(analyst, "/api/rankings/drafts/" + draftId)).body
            .payload.working.ticker,
          "PETR4",
        );
        assert.equal(
          (
            await request(analyst, "/api/rankings/drafts/" + draftId, {
              method: "PUT",
              body: { payload, version: 1 },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(analyst, "/api/rankings/drafts/" + draftId, {
              method: "PUT",
              body: { payload, version: 1 },
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "progresso sincronizado é pessoal e valida a resposta",
      async () => {
        assert.equal(
          (
            await request(a, "/api/learning/progress/risco", {
              method: "PUT",
              body: { answer: 0 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(a, "/api/learning/progress/risco", {
              method: "PUT",
              body: { answer: 2 },
            })
          ).status,
          200,
        );
        assert.deepEqual((await request(a, "/api/learning")).body.completed, [
          "risco",
        ]);
        assert.deepEqual(
          (await request(b, "/api/learning")).body.completed,
          [],
        );
        assert.equal(
          (await request(null, "/api/learning")).body.lessons[1].locked,
          true,
        );
        await request(a, "/api/learning/progress", { method: "DELETE" });
        assert.deepEqual(
          (await request(a, "/api/learning")).body.completed,
          [],
        );
      },
    );
    await fixture.clearLimits();
    await t.test(
      "IA: validação, privacidade, recuperação, falha e limites",
      async () => {
        const chat = {
          messages: [{ role: "user", text: "O que é diversificação?" }],
        };
        assert.equal(
          (
            await request(null, "/api/assistant/chat", {
              method: "POST",
              body: chat,
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request(a, "/api/assistant/chat", {
              method: "POST",
              body: {
                messages: [
                  { role: "user", text: "email: pessoa@example.test" },
                ],
              },
            })
          ).status,
          400,
        );
        state.ai = "retry";
        state.aiCalls = 0;
        assert.equal(
          (
            await request(a, "/api/assistant/chat", {
              method: "POST",
              body: chat,
            })
          ).status,
          200,
        );
        assert.equal(state.aiCalls, 2);
        state.ai = "down";
        assert.equal(
          (
            await request(a, "/api/assistant/chat", {
              method: "POST",
              body: chat,
            })
          ).status,
          503,
        );
        state.ai = "quota";
        assert.equal(
          (
            await request(a, "/api/assistant/chat", {
              method: "POST",
              body: chat,
            })
          ).status,
          429,
        );
        state.ai = "ok";
        for (let i = 0; i < 10; i++)
          await request(a, "/api/assistant/chat", {
            method: "POST",
            body: chat,
          });
        assert.equal(
          (
            await request(a, "/api/assistant/chat", {
              method: "POST",
              body: chat,
            })
          ).status,
          429,
        );
      },
    );
    await fixture.clearLimits();
    await t.test(
      "bloquear conta revoga sessões; promover exige confirmação",
      async () => {
        assert.equal(
          (
            await request(admin, "/api/admin/users/" + b.id + "/access", {
              method: "PATCH",
              body: { blocked: true },
            })
          ).status,
          200,
        );
        assert.equal((await request(b, "/api/auth/me")).status, 401);
        assert.equal(
          (
            await request(b, "/api/auth/login", {
              method: "POST",
              body: { email: b.email, password },
            })
          ).status,
          401,
        );
        await request(admin, "/api/admin/users/" + b.id + "/access", {
          method: "PATCH",
          body: { blocked: false, role: "ANALYST" },
        });
        assert.equal(
          (
            await request(b, "/api/auth/login", {
              method: "POST",
              body: { email: b.email, password },
            })
          ).body.user.role,
          "ANALYST",
        );
        await request(admin, "/api/admin/users/" + b.id + "/access", {
          method: "PATCH",
          body: { role: "USER" },
        });
        assert.equal((await request(b, "/api/auth/me")).status, 401);
        assert.equal(
          (
            await request(admin, "/api/admin/users/" + admin.id + "/access", {
              method: "PATCH",
              body: { role: "USER" },
            })
          ).status,
          409,
        );
        assert.equal((await request(admin, "/api/admin/audit")).status, 200);
      },
    );
    await t.test(
      "exportação é própria e exclusão mantém último Administrador",
      async () => {
        const exported = await request(a, "/api/auth/export");
        assert.equal(exported.status, 200);
        assert.equal(exported.body.profile.id, a.id);
        assert.ok(!JSON.stringify(exported.body).includes("password_hash"));
        assert.equal(
          (
            await request(admin, "/api/auth/me", {
              method: "DELETE",
              body: { password, confirmation: "EXCLUIR" },
            })
          ).status,
          409,
        );
        await request(b, "/api/auth/login", {
          method: "POST",
          body: { email: b.email, password },
        });
        assert.equal(
          (
            await request(b, "/api/auth/me", {
              method: "DELETE",
              body: { password, confirmation: "EXCLUIR" },
            })
          ).status,
          204,
        );
        assert.equal((await request(b, "/api/auth/me")).status, 401);
        const [rows] = await pool.execute("SELECT id FROM users WHERE id=?", [
          b.id,
        ]);
        assert.equal(rows.length, 0);
      },
    );
    await fixture.clearLimits();
    await t.test(
      "recuperação, troca de senha e revogação de sessões",
      async () => {
        const oldCookie = a.cookie;
        const forgot = await request(a, "/api/auth/password/forgot", {
          method: "POST",
          body: { email: a.email },
        });
        assert.equal(forgot.status, 202);
        const token = new URL(forgot.body.developmentUrl).hash.slice(1);
        const next = password + "-new";
        assert.equal(
          (
            await request(a, "/api/auth/password/reset", {
              method: "POST",
              body: { token, password: next },
            })
          ).status,
          200,
        );
        assert.equal(
          (await request({ cookie: oldCookie }, "/api/auth/me")).status,
          401,
        );
        assert.equal(
          (
            await request(a, "/api/auth/password/reset", {
              method: "POST",
              body: { token, password: next },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(a, "/api/auth/login", {
              method: "POST",
              body: { email: a.email, password },
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request(a, "/api/auth/login", {
              method: "POST",
              body: { email: a.email, password: next },
            })
          ).status,
          200,
        );
        await fixture.clearLimits();
        assert.equal(
          (
            await request(a, "/api/auth/password/change", {
              method: "POST",
              body: { currentPassword: next, password: password + "-changed" },
            })
          ).status,
          200,
        );
        assert.equal((await request(a, "/api/auth/me")).status, 401);
        await request(a, "/api/auth/login", {
          method: "POST",
          body: { email: a.email, password: password + "-changed" },
        });
        assert.equal(
          (await request(a, "/api/auth/sessions/revoke", { method: "POST" }))
            .status,
          204,
        );
        assert.equal((await request(a, "/api/auth/me")).status, 401);
      },
    );
    await fixture.clearLimits();
    await t.test(
      "conta pendente não pode receber perfil de equipe",
      async () => {
        const email = "pending@ediv.test";
        assert.equal(
          (
            await request(null, "/api/auth/register", {
              method: "POST",
              body: { name: "Pendente", email, password },
            })
          ).status,
          202,
        );
        const [rows] = await pool.execute(
          "SELECT id FROM users WHERE email=?",
          [email],
        );
        assert.equal(
          (
            await request(admin, "/api/admin/users/" + rows[0].id + "/access", {
              method: "PATCH",
              body: { role: "ANALYST" },
            })
          ).status,
          409,
        );
      },
    );
    await fixture.clearLimits();
    await t.test(
      "IA distingue limites de conta e projeto e exige histórico válido",
      async () => {
        const { MysqlLimitStore } = await import("../server/limit-store.js");
        const limiter = new MysqlLimitStore("assistant-account-daily");
        limiter.init({ windowMs: 86400000 });
        await request(a, "/api/auth/login", {
          method: "POST",
          body: { email: a.email, password: password + "-changed" },
        });
        const chat = { messages: [{ role: "user", text: "O que é risco?" }] };
        assert.equal(
          (
            await request(a, "/api/assistant/chat", {
              method: "POST",
              body: {
                messages: [
                  { role: "model", text: "Texto" },
                  { role: "user", text: "Pergunta" },
                ],
              },
            })
          ).status,
          400,
        );
        await pool.execute(
          "INSERT INTO request_limits(bucket,hits,expires_at) VALUES(?,20,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 DAY))",
          [limiter.bucket(a.id)],
        );
        const limited = await request(a, "/api/assistant/chat", {
          method: "POST",
          body: chat,
        });
        assert.equal(limited.status, 429);
        assert.match(limited.body.error, /20 perguntas/);
        await fixture.clearLimits();
        const project = new MysqlLimitStore("assistant-project");
        project.init({ windowMs: 86400000 });
        await pool.execute(
          "INSERT INTO request_limits(bucket,hits,expires_at) VALUES(?,100,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 DAY))",
          [project.bucket("all")],
        );
        const global = await request(a, "/api/assistant/chat", {
          method: "POST",
          body: chat,
        });
        assert.equal(global.status, 429);
        assert.match(global.body.error, /limite diário/);
      },
    );
  });
} finally {
  await fixture.cleanup();
}
