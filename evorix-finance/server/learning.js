import { Router } from "express";
import { currentUser, requireAuthenticatedUser } from "./auth.js";
import { pool } from "./database.js";
import { z } from "zod";
import { lessons, glossary } from "./learning-content.js";

const router = Router();
router.get("/", async (req, res) => {
  const user = await currentUser(req);
  const [progress] = user
    ? await pool.execute(
        "SELECT lesson_id FROM learning_progress WHERE user_id=?",
        [user.id],
      )
    : [[]];
  return res.json({
    access: user ? "full" : "preview",
    lessons: lessons.map((lesson, index) =>
      user || index === 0
        ? { ...lesson, locked: false }
        : { id: lesson.id, title: lesson.title, locked: true },
    ),
    glossary,
    completed: progress.map((row) => row.lesson_id),
  });
});
router.put("/progress/:id", requireAuthenticatedUser, async (req, res) => {
  const lesson = lessons.find((lesson) => lesson.id === req.params.id);
  const parsed = z
    .object({ answer: z.number().int().min(0).max(10) })
    .strict()
    .safeParse(req.body);
  if (!lesson || !parsed.success)
    return res.status(400).json({ error: "Etapa ou resposta inválida." });
  if (parsed.data.answer !== lesson.answer)
    return res
      .status(400)
      .json({ error: "Revise a explicação e tente novamente." });
  await pool.execute(
    "INSERT IGNORE INTO learning_progress(user_id,lesson_id) VALUES(?,?)",
    [req.authenticatedUser.id, lesson.id],
  );
  res.json({ message: "Progresso salvo na sua conta." });
});
router.delete("/progress", requireAuthenticatedUser, async (req, res) => {
  await pool.execute("DELETE FROM learning_progress WHERE user_id=?", [
    req.authenticatedUser.id,
  ]);
  res.status(204).end();
});
export { router as learningRouter };
