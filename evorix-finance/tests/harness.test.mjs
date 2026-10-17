import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { run, stateFile, normalizeClaim, projectRoot } from '../scripts/harness.mjs';

function fixture(t) {
  const artifacts = path.join(projectRoot, '.test-artifacts');
  mkdirSync(artifacts, { recursive: true });
  const root = mkdtempSync(path.join(artifacts, 'ediv-harness-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'state.json');
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  for (const session of Object.values(state.sessions)) session.claims = [];
  writeFileSync(file, JSON.stringify(state));
  return file;
}

test('recusa sobreposição de diretório e preserva o quadro anterior', t => {
  const file = fixture(t);
  run(['claim', 'interface', 'src/components'], file);
  const before = readFileSync(file, 'utf8');
  assert.throws(() => run(['claim', 'backend', 'SRC/components/Test.tsx'], file), /Conflito/);
  assert.equal(readFileSync(file, 'utf8'), before);
  run(['claim', 'backend', 'server'], file);
  run(['release', 'interface'], file);
  run(['claim', 'backend', 'src/components/Test.tsx'], file);
});

test('atualiza estado e rejeita fase/papel inválido sem perder dados', t => {
  const file = fixture(t);
  run(['update', 'interface', 'revisao', 'Acessibilidade verificada'], file);
  assert.equal(JSON.parse(readFileSync(file)).sessions.interface.phase, 'revisao');
  const before = readFileSync(file, 'utf8');
  assert.throws(() => run(['update', 'interface', 'qualquer', 'texto'], file));
  assert.throws(() => run(['release', 'intruso'], file));
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('lock exclusivo impede segunda gravação e não é removido por ela', t => {
  const file = fixture(t);
  mkdirSync(`${file}.lock`);
  const before = readFileSync(file, 'utf8');
  assert.throws(() => run(['claim', 'backend', 'server'], file), /Quadro em atualização/);
  assert.equal(readFileSync(file, 'utf8'), before);
  assert.throws(() => mkdirSync(`${file}.lock`), { code: 'EEXIST' });
});

test('rejeita caminhos externos e caminhos do quadro', () => {
  for (const value of ['../server', '/server', 'C:\\server', 'a/../b', 'docs/harness/state.json']) {
    assert.throws(() => normalizeClaim(value));
  }
});
