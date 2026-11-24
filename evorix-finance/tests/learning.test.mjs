import test from "node:test";
import assert from "node:assert/strict";
import {
  learningCourses,
  lessons,
  serializeLessons,
} from "../server/learning-content.js";

test("guest serialization retains the first lesson but no quiz; member quizzes stay intact", () => {
  const original = structuredClone(lessons);
  const preview = serializeLessons(false);
  assert.equal(preview.length, 7);
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
      ["acoes", 1],
      ["corretora", 2],
      ["comprar-acoes", 0],
      ["inflacao", 0],
      ["ciclos", 2],
      ["fundamentalista", 0],
      ["preco-teto", 2],
    ],
  );
  assert.deepEqual(lessons, original);
  assert.deepEqual(
    learningCourses.map(({ id, chapterIds }) => [id, chapterIds]),
    [
      ["primeiros-passos", ["acoes", "corretora", "comprar-acoes"]],
      ["economia", ["inflacao", "ciclos"]],
      ["analise", ["fundamentalista", "preco-teto"]],
    ],
  );
  assert.deepEqual(
    serializeLessons(false),
    preview,
    "member requests cannot unlock the cached public catalog",
  );
});

test("catalog integrity: unique ids, valid answers, courses cover every lesson once", () => {
  const ids = lessons.map((lesson) => lesson.id);
  assert.equal(new Set(ids).size, ids.length, "lesson ids must be unique");
  for (const lesson of lessons) {
    for (const key of ["title", "text", "question", "explanation"])
      assert.ok(
        typeof lesson[key] === "string" && lesson[key].trim(),
        `${lesson.id}.${key} must not be empty`,
      );
    for (const key of ["sections", "takeaways", "choices", "sources"])
      assert.ok(
        Array.isArray(lesson[key]) && lesson[key].length > 0,
        `${lesson.id}.${key} must not be empty`,
      );
    assert.ok(
      Number.isInteger(lesson.answer) &&
        lesson.answer >= 0 &&
        lesson.answer < lesson.choices.length,
      `${lesson.id}.answer must index a choice`,
    );
    assert.equal(
      new Set(lesson.choices).size,
      lesson.choices.length,
      `${lesson.id} choices must differ`,
    );
    for (const source of lesson.sources)
      assert.ok(
        source.url.startsWith("https://"),
        `${lesson.id} source url must use https`,
      );
  }
  const courseIds = learningCourses.map((course) => course.id);
  assert.equal(new Set(courseIds).size, courseIds.length, "course ids must be unique");
  const covered = learningCourses.flatMap((course) => course.chapterIds);
  assert.deepEqual(
    covered,
    ids,
    "lessons follow the course order and each lesson sits in exactly one course",
  );
});
