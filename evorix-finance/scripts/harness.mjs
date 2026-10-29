import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const stateFile = path.join(projectRoot, "docs/harness/state.json");
const phases = new Set([
  "pronto",
  "trabalhando",
  "bloqueado",
  "revisao",
  "concluido",
]);

export function normalizeClaim(value) {
  const normalized = value
    .replaceAll("\\", "/")
    .replace(/\/+$/, "")
    .toLowerCase();
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-z]:/.test(normalized) ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Caminho relativo inválido: ${value}`);
  }
  if (
    normalized === "docs/harness/state.json" ||
    normalized.startsWith("docs/harness/state.json.")
  ) {
    throw new Error("O quadro e seu lock são gerenciados pelo script.");
  }
  return normalized;
}

export function overlaps(a, b) {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function validate(state) {
  if (![1, 2].includes(state.version) || typeof state.workspace !== "string")
    throw new Error("Quadro inválido.");
  const entries = Object.entries(state.sessions ?? {});
  const roles =
    state.version === 2
      ? ["coordenacao", "interface", "backend", "qa"]
      : ["coordenacao", "interface", "backend"];
  if (
    entries.length !== roles.length ||
    !roles.every((id) => state.sessions[id])
  ) {
    throw new Error("O quadro deve conter exatamente os papéis da sua versão.");
  }
  const claimed = [];
  for (const [id, session] of entries) {
    if (
      !phases.has(session.phase) ||
      typeof session.summary !== "string" ||
      !session.summary.trim() ||
      !Number.isFinite(Date.parse(session.updatedAt)) ||
      !Array.isArray(session.claims)
    ) {
      throw new Error(`Estado inválido: ${id}`);
    }
    for (const raw of session.claims) {
      const claim = normalizeClaim(raw);
      const conflict = claimed.find(
        (item) => item.id !== id && overlaps(item.claim, claim),
      );
      if (conflict)
        throw new Error(
          `Conflito: ${id}:${claim} com ${conflict.id}:${conflict.claim}`,
        );
      claimed.push({ id, claim });
    }
  }
  return state;
}

export function mutate(file, action) {
  const lock = `${file}.lock`;
  const temp = `${file}.${process.pid}.tmp`;
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "Quadro em atualização; repita após o comando anterior terminar.",
      );
    throw error;
  }
  try {
    const state = validate(JSON.parse(readFileSync(file, "utf8")));
    action(state);
    validate(state);
    writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: "wx" });
    renameSync(temp, file);
    return state;
  } finally {
    if (existsSync(temp)) rmSync(temp);
    rmdirSync(lock);
  }
}

export function run(args, file = stateFile) {
  if (args[0] === "upgrade") {
    const upgraded = mutate(file, (state) => {
      if (state.version === 2) return;
      // Preserve the previous board before explicitly retiring stale checkout claims.
      const archive = path.join(path.dirname(file), "state.v1.archive.json");
      writeFileSync(archive, `${JSON.stringify(state, null, 2)}\n`, {
        flag: "wx",
      });
      state.version = 2;
      state.workspace = ".";
      for (const session of Object.values(state.sessions)) session.claims = [];
      state.sessions.qa = {
        phase: "pronto",
        summary: "QA independente configurado",
        updatedAt: new Date().toISOString(),
        claims: [],
      };
    });
    return JSON.stringify(upgraded, null, 2);
  }
  if (file === stateFile) {
    const workspace = JSON.parse(readFileSync(file, "utf8")).workspace;
    if (
      typeof workspace !== "string" ||
      path.resolve(projectRoot, workspace).toLowerCase() !==
        path.resolve(projectRoot).toLowerCase()
    ) {
      throw new Error(
        "Checkout diferente do quadro compartilhado. Consulte a coordenação antes de editar.",
      );
    }
  }
  const [command = "status", id, ...rest] = args;
  if (command === "status" || command === "check") {
    const state = validate(JSON.parse(readFileSync(file, "utf8")));
    if (command === "check")
      return `Harness: quadro válido; ${Object.keys(state.sessions).length} papéis e reservas sem conflito.`;
    return JSON.stringify(state, null, 2);
  }
  if (!["claim", "release", "update"].includes(command))
    throw new Error("Use status, check, claim, release ou update.");
  const state = mutate(file, (data) => {
    const session = data.sessions[id];
    if (!session)
      throw new Error(
        "Papel inválido: use coordenacao, interface, backend ou qa.",
      );
    if (command === "claim") {
      if (!rest.length) throw new Error("Informe ao menos um caminho.");
      session.claims = [
        ...new Set([...session.claims, ...rest.map(normalizeClaim)]),
      ];
    }
    if (command === "release") session.claims = [];
    if (command === "update") {
      const [phase, ...summary] = rest;
      if (!phases.has(phase) || !summary.join(" ").trim())
        throw new Error("Informe uma fase válida e um resumo.");
      session.phase = phase;
      session.summary = summary.join(" ");
    }
    session.updatedAt = new Date().toISOString();
  });
  return JSON.stringify(state.sessions[id], null, 2);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
