import test from "node:test";
import assert from "node:assert/strict";
import {
  learningCourses,
  lessons,
  openLessonId,
  serializeLessons,
} from "../server/learning-content.js";
import {
  learningChapters,
  learningCourses as clientCourses,
  openLessonId as clientOpenLessonId,
} from "../src/lib/learningCatalog.ts";

const lessonOrder = [
  "corretora",
  "acoes",
  "comprar-acoes",
  "inflacao",
  "ciclos",
  "fundamentalista",
  "preco-teto",
];

test("guest serialization retains only the open lesson (acoes) and no quiz; member quizzes stay intact", () => {
  const original = structuredClone(lessons);
  const preview = serializeLessons(false);
  assert.equal(openLessonId, "acoes");
  assert.deepEqual(
    preview.map((lesson) => lesson.id),
    lessonOrder,
  );
  assert.deepEqual(
    preview.filter((lesson) => !lesson.locked).map((lesson) => lesson.id),
    [openLessonId],
  );
  const open = preview.find((lesson) => lesson.id === openLessonId);
  const source = original.find((lesson) => lesson.id === openLessonId);
  assert.deepEqual(Object.keys(open), [
    "id",
    "title",
    "text",
    "sections",
    "takeaways",
    "sources",
    "locked",
  ]);
  for (const key of ["id", "title", "text", "sections", "takeaways", "sources"])
    assert.deepEqual(open[key], source[key]);
  assert.equal(open.locked, false);
  for (const lesson of preview)
    for (const key of ["question", "choices", "answer", "explanation"])
      assert.equal(
        Object.hasOwn(lesson, key),
        false,
        `${lesson.id}/${key} must not reach guests`,
      );
  assert.deepEqual(
    preview.filter((lesson) => lesson.id !== openLessonId),
    original
      .filter((lesson) => lesson.id !== openLessonId)
      .map(({ id, title }) => ({ id, title, locked: true })),
  );
  const full = serializeLessons(true);
  assert.deepEqual(
    full,
    original.map((lesson) => ({ ...lesson, locked: false })),
  );
  assert.deepEqual(
    full.map(({ id, answer }) => [id, answer]),
    [
      ["corretora", 2],
      ["acoes", 1],
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
      ["primeiros-passos", ["corretora", "acoes", "comprar-acoes"]],
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

test("server and client catalogs agree on lesson order, courses and the open lesson", () => {
  assert.equal(clientOpenLessonId, openLessonId);
  assert.deepEqual(
    learningChapters.map((chapter) => chapter.id),
    lessons.map((lesson) => lesson.id),
  );
  assert.deepEqual(
    clientCourses.map(({ id, chapterIds }) => [id, chapterIds]),
    learningCourses.map(({ id, chapterIds }) => [id, chapterIds]),
  );
  assert.ok(
    learningCourses.some((course) => course.chapterIds.includes(openLessonId)),
    "the open lesson must belong to a course",
  );
});
