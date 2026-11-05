// QA exploratório: login e confirmação de e-mail contra a API real e um MySQL
// descartável (fixture do projeto). Não toca produção.
import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";

const fixture = await createFixture();
const { request, pool, password, accounts } = fixture;
const tokenOf = (res) => new URL(res.body.verificationUrl).hash.slice(1);
const register = (email, pwd = password, name = "Pessoa QA") =>
  request(null, "/api/auth/register", { method: "POST", body: { name, email, password: pwd } });
const login = (email, pwd = password, opts = {}) =>
  request(opts.account ?? { cookie: "" }, "/api/auth/login", { method: "POST", body: { email, password: pwd }, ...opts });
const verify = (token) => request(null, "/api/auth/verify-email", { method: "POST", body: { token } });
const resend = (email) => request(null, "/api/auth/verification/resend", { method: "POST", body: { email } });

try {
  await test("QA login e confirmação de e-mail", async (t) => {
    t.beforeEach(() => fixture.clearLimits());

    await t.test("1. pendente: senha certa avisa confirmação; senha errada não revela a conta", async () => {
      const r = await register("pendente@ediv.test");
      assert.equal(r.status, 202);
      const certo = await login("pendente@ediv.test");
      assert.equal(certo.status, 401);
      assert.equal(certo.body.code, "EMAIL_NOT_VERIFIED");
      const errado = await login("pendente@ediv.test", "Senha-Errada-2026!");
      assert.equal(errado.status, 401);
      assert.equal(errado.body.code, undefined);
      const inexistente = await login("ninguem@ediv.test", "Senha-Errada-2026!");
      assert.deepEqual(inexistente.body, errado.body, "mensagem diferente permite descobrir contas");
    });

    await t.test("2. reenvio invalida o link anterior e o novo funciona", async (t) => {
      const r = await register("reenvio@ediv.test");
      const antigo = tokenOf(r);
      const cedo = await resend("reenvio@ediv.test");
      assert.equal(cedo.status, 429, "reenvio imediato após cadastro");
      assert.equal(cedo.body.code, "RATE_LIMITED");
      t.diagnostic("reenvio imediato: " + cedo.status + " · RateLimit: " + cedo.headers.get("ratelimit") + " · msg: " + cedo.body.error);
      await fixture.clearLimits(); // simula 1 minuto depois
      const re = await resend("reenvio@ediv.test");
      assert.equal(re.status, 202);
      const novo = tokenOf(re);
      assert.notEqual(novo, antigo);
      assert.equal((await verify(antigo)).status, 400, "link antigo ainda vale");
      assert.equal((await verify(novo)).status, 200);
      assert.equal((await login("reenvio@ediv.test")).status, 200);
    });

    await t.test("3. reenvio não revela se o e-mail existe ou já foi confirmado", async () => {
      const verificado = await resend(accounts.a.email);
      const inexistente = await resend("nao-existe@ediv.test");
      assert.equal(verificado.status, 202);
      assert.equal(inexistente.status, 202);
      assert.deepEqual(verificado.body, inexistente.body);
      assert.equal(verificado.body.verificationUrl, undefined);
    });

    await t.test("4. link expirado é recusado", async () => {
      const r = await register("expirado@ediv.test");
      await pool.execute(
        "UPDATE email_verification_tokens t JOIN users u ON u.id=t.user_id SET t.expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 MINUTE) WHERE u.email=?",
        ["expirado@ediv.test"],
      );
      const v = await verify(tokenOf(r));
      assert.equal(v.status, 400);
      assert.match(v.body.error, /expirou/);
      assert.equal((await login("expirado@ediv.test")).body.code, "EMAIL_NOT_VERIFIED");
    });

    await t.test("5. tokens malformados dão 400, nunca 500", async () => {
      for (const token of ["", " ", "x".repeat(5000), "' OR 1=1 --", 123, null, ["a"], { $ne: 1 }]) {
        const v = await request(null, "/api/auth/verify-email", { method: "POST", body: { token } });
        assert.ok([400].includes(v.status), `token ${JSON.stringify(token).slice(0, 30)} → ${v.status}`);
        await fixture.clearLimits();
      }
    });

    await t.test("6. mesmo link aberto 5 vezes ao mesmo tempo confirma uma vez só", async () => {
      const r = await register("concorrente@ediv.test");
      const token = tokenOf(r);
      const res = await Promise.all(Array.from({ length: 5 }, () => verify(token)));
      const st = res.map((x) => x.status).sort();
      assert.deepEqual(st, [200, 400, 400, 400, 400]);
    });

    await t.test("7. cadastro repetido não revela a conta nem troca a senha", async () => {
      const r = await register(accounts.b.email, "Outra-Senha-Forte-2026!", "Invasor");
      assert.equal(r.status, 202);
      assert.equal(r.body.verificationUrl, undefined);
      assert.equal((await login(accounts.b.email)).status, 200, "senha original deixou de funcionar");
      assert.equal((await login(accounts.b.email, "Outra-Senha-Forte-2026!")).status, 401);
    });

    await t.test("8. e-mail com maiúsculas e espaços é a mesma conta", async () => {
      const r = await register("  Caixa.Alta@Ediv.TEST ");
      assert.equal(r.status, 202);
      assert.equal((await verify(tokenOf(r))).status, 200);
      assert.equal((await login("caixa.alta@ediv.test")).status, 200);
      assert.equal((await login(" CAIXA.ALTA@EDIV.TEST ")).status, 200);
      const dup = await register("caixa.alta@ediv.test");
      assert.equal(dup.body.verificationUrl, undefined, "criou segunda conta com outra caixa");
      const [rows] = await pool.execute("SELECT COUNT(*) n FROM users WHERE email='caixa.alta@ediv.test'");
      assert.equal(Number(rows[0].n), 1);
    });

    await t.test("9. sessão: cookie seguro, /me funciona e sair revoga", async () => {
      const acc = { email: accounts.a.email, password, cookie: "" };
      const l = await login(acc.email, password, { account: acc });
      assert.equal(l.status, 200);
      const ck = l.headers.get("set-cookie");
      assert.match(ck, /HttpOnly/i);
      assert.match(ck, /SameSite=Strict/i);
      assert.equal((await request(acc, "/api/auth/me")).status, 200);
      const antigo = acc.cookie;
      assert.equal((await request(acc, "/api/auth/logout", { method: "POST" })).status < 300, true);
      assert.equal((await request({ cookie: antigo }, "/api/auth/me")).status, 401, "cookie antigo continua válido após sair");
    });

    await t.test("10. login de outro site (CSRF) é barrado", async () => {
      const l = await login(accounts.a.email, password, { originHeader: "https://site-malicioso.test" });
      assert.equal(l.status, 403);
    });

    await t.test("11. força bruta: limite de tentativas entra em ação", async () => {
      const codes = [];
      for (let i = 0; i < 25; i++) codes.push((await login(accounts.analyst.email, "Errada-" + i + "-Xx!")).status);
      assert.ok(codes.includes(429), "nenhum 429 em 25 tentativas: " + codes.join(","));
      const first429 = codes.indexOf(429);
      const correta = await login(accounts.analyst.email);
      assert.equal(correta.status, 429, "senha certa deveria esperar o bloqueio terminar");
      t.diagnostic(`primeiro 429 na tentativa ${first429 + 1}`);
    });

    await t.test("12. corpo inválido e senha enorme não derrubam a API", async () => {
      const raw = await request(null, "/api/auth/login", { method: "POST", raw: "{nao-e-json", headers: { "Content-Type": "application/json" } });
      assert.ok(raw.status >= 400 && raw.status < 500, "JSON quebrado → " + raw.status);
      await fixture.clearLimits();
      const big = await login(accounts.a.email, "A".repeat(100000));
      assert.ok(big.status >= 400 && big.status < 500, "senha de 100 mil caracteres → " + big.status);
      await fixture.clearLimits();
      const tipo = await request(null, "/api/auth/login", { method: "POST", body: { email: ["x"], password: { a: 1 } } });
      assert.equal(tipo.status, 400);
    });

    await t.test("13. limite de confirmação não bloqueia o reenvio (contadores separados)", async () => {
      const r = await register("contadores@ediv.test");
      await fixture.clearLimits(); // passa o intervalo de 1 e-mail por minuto
      for (let i = 0; i < 10; i++) await verify("token-invalido-" + i);
      assert.equal((await verify("mais-um")).status, 429);
      const re = await resend("contadores@ediv.test");
      assert.equal(re.status, 202, "reenvio bloqueado pelo limite da confirmação");
      assert.ok(r.status === 202);
    });

    await t.test("14. confirmar o e-mail não cria sessão sozinho (precisa entrar)", async () => {
      const r = await register("semsessao@ediv.test");
      const v = await verify(tokenOf(r));
      assert.equal(v.status, 200);
      assert.equal(v.headers.get("set-cookie"), null);
    });

    await t.test("15. link de confirmação usa o domínio configurado e não aceita redirecionamento externo", async () => {
      const r = await request(null, "/api/auth/register", {
        method: "POST",
        body: { name: "Redirect", email: "redir@ediv.test", password, next: "https://evil.test/roubar" },
      });
      const url = new URL(r.body.verificationUrl);
      assert.equal(url.origin, "http://127.0.0.1:4180");
      assert.equal(url.searchParams.get("next"), null, "next externo foi aceito: " + url.search);
      const ok = await request(null, "/api/auth/register", {
        method: "POST",
        body: { name: "Redirect2", email: "redir2@ediv.test", password, next: "/app/ranking" },
      });
      assert.equal(new URL(ok.body.verificationUrl).searchParams.get("next"), "/app/ranking");
    });
  });
} finally {
  await fixture.cleanup();
}
