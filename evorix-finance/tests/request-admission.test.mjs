import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequestAdmission } from "../server/request-admission.js";

function response() {
  const res = new EventEmitter();
  res.code = 200;
  res.headers = {};
  res.setHeader = (key, value) => {
    res.headers[key] = value;
  };
  res.status = (code) => {
    res.code = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test("limite real60/10s persiste dentro do cenário, reset isola próximo cenário", () => {
  let time = 0;
  const guard = createRequestAdmission({ now: () => time });
  for (let i = 0; i < 60; i++) {
    const res = response();
    guard({ securityIpKey: "same-ip" }, res, () => res.emit("finish"));
    assert.equal(res.code, 200);
  }
  let res = response();
  guard({ securityIpKey: "same-ip" }, res, () =>
    assert.fail("61st request passed"),
  );
  assert.equal(res.code, 429);
  assert.equal(res.headers["Retry-After"], "10");
  time = 10000;
  res = response();
  guard({ securityIpKey: "same-ip" }, res, () => res.emit("finish"));
  assert.equal(res.code, 200);
  guard.reset();
  res = response();
  guard({ securityIpKey: "same-ip" }, res, () => res.emit("finish"));
  assert.equal(res.code, 200);
});

test("32 solicitações ativas continuam protegidas e reset recusa trabalho em voo", () => {
  const guard = createRequestAdmission();
  const active = [];
  for (let i = 0; i < 32; i++) {
    const res = response();
    guard({ securityIpKey: `ip-${i}` }, res, () => active.push(res));
  }
  assert.throws(() => guard.reset(), /terminarem/);
  const excess = response();
  guard({ securityIpKey: "ip-extra" }, excess, () =>
    assert.fail("active limit bypassed"),
  );
  assert.equal(excess.code, 503);
  active.forEach((res) => {
    res.emit("finish");
    res.emit("close");
  });
  guard.reset();
  const res = response();
  guard({ securityIpKey: "ip-next" }, res, () => res.emit("finish"));
  assert.equal(res.code, 200);
});

test("dreno aguarda finish/close, tem prazo e não libera requisição ativa", async () => {
  const guard = createRequestAdmission();
  assert.equal(guard.isIdle(), true);
  await guard.waitForIdle();
  const first = response();
  const second = response();
  guard({ securityIpKey: "first" }, first, () => {});
  guard({ securityIpKey: "second" }, second, () => {});
  assert.equal(guard.isIdle(), false);
  await assert.rejects(guard.waitForIdle(5), /Tempo esgotado/);
  assert.throws(() => guard.reset(), /terminarem/);
  let drained = false;
  const waiting = guard.waitForIdle().then(() => {
    drained = true;
  });
  first.emit("finish");
  await Promise.resolve();
  assert.equal(drained, false);
  assert.equal(guard.isIdle(), false);
  second.emit("close");
  await waiting;
  assert.equal(guard.isIdle(), true);
  guard.reset();
});

test("chaves de rajada têm teto5000 e vencidas são removidas antes de admitir novas", () => {
  let time = 0;
  const guard = createRequestAdmission({ now: () => time });
  for (let i = 0; i < 5000; i++) {
    const res = response();
    guard({ securityIpKey: `key-${i}` }, res, () => res.emit("finish"));
    assert.equal(res.code, 200);
  }
  const excess = response();
  guard({ securityIpKey: "key-extra" }, excess, () =>
    assert.fail("key cap bypassed"),
  );
  assert.equal(excess.code, 503);
  time = 10000;
  const res = response();
  guard({ securityIpKey: "key-extra" }, res, () => res.emit("finish"));
  assert.equal(res.code, 200);
});
