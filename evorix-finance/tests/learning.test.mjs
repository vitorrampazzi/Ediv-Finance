import test from "node:test";
import assert from "node:assert/strict";
import { lessons, serializeLessons } from "../server/learning-content.js";

test("guest serialization retains the first lesson but no quiz; member quizzes stay intact", () => {
  const original = structuredClone(lessons);
  const preview = serializeLessons(false);
  assert.equal(preview.length, 4);
  assert.deepEqual(Object.keys(preview[0]), [
    "id",
    "title",
    "text",
    "sections",
    "takeaways",
    "sources",
    "locked",
  ]);
  for (const key of ["id", "title", "text", "sections", "takeaways", "sources"])
    assert.deepEqual(preview[0][key], original[0][key]);
  assert.equal(preview[0].locked, false);
  for (const lesson of preview)
    for (const key of ["question", "choices", "answer", "explanation"])
      assert.equal(
        Object.hasOwn(lesson, key),
        false,
        `${lesson.id}/${key} must not reach guests`,
      );
  assert.deepEqual(
    preview.slice(1),
    original.slice(1).map(({ id, title }) => ({ id, title, locked: true })),
  );
  const full = serializeLessons(true);
  assert.deepEqual(
    full,
    original.map((lesson) => ({ ...lesson, locked: false })),
  );
  assert.deepEqual(
    full.map(({ id, answer }) => [id, answer]),
    [
      ["ranking", 1],
      ["risco", 2],
      ["dividendos", 0],
      ["carteira", 1],
    ],
  );
  assert.deepEqual(lessons, original);
  assert.deepEqual(
    serializeLessons(false),
    preview,
    "member requests cannot unlock the cached public catalog",
  );
});
