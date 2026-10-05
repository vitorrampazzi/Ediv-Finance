import { Router } from "express";
import { currentUser } from "./auth.js";
import { lessons, glossary } from "./learning-content.js";

const router = Router();
router.get("/", async (req, res) => {
  const user = await currentUser(req);
  return res.json({
    access: user ? "full" : "preview",
    lessons: lessons.map((lesson, index) =>
      user || index === 0
        ? { ...lesson, locked: false }
        : { id: lesson.id, title: lesson.title, locked: true },
    ),
    glossary,
  });
});
export { router as learningRouter };
