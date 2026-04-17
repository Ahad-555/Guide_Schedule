import { Router } from "express";
import { db, assistantKnowledgeTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/assistant/knowledge", async (_req, res) => {
  const items = await db.select().from(assistantKnowledgeTable);
  res.json(items);
});

router.post("/assistant/knowledge", async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  const [item] = await db.insert(assistantKnowledgeTable).values({ title, content }).returning();
  res.status(201).json(item);
});

router.put("/assistant/knowledge/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  const [item] = await db.update(assistantKnowledgeTable).set({ title, content }).where(eq(assistantKnowledgeTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

router.delete("/assistant/knowledge/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(assistantKnowledgeTable).where(eq(assistantKnowledgeTable.id, id));
  res.status(204).send();
});

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/[ةه]/g, "ه")
    .replace(/[يى]/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function getKeywords(message: string): string[] {
  return normalize(message)
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

function matches(text: string, keywords: string[]): boolean {
  const norm = normalize(text);
  return keywords.some(kw => norm.includes(kw));
}

router.post("/assistant/chat", async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const keywords = getKeywords(message);
  if (keywords.length === 0) {
    res.json({ reply: "اكتبي اسم القاعة أو رقمها أو اسم المادة وسأساعدك 😊" });
    return;
  }

  const [courses, knowledge] = await Promise.all([
    db.select().from(coursesTable),
    db.select().from(assistantKnowledgeTable),
  ]);

  const parts: string[] = [];

  // Search knowledge items first (admin-written descriptions)
  const matchedKnowledge = knowledge.filter(k =>
    matches(k.title, keywords) || matches(k.content, keywords)
  );
  for (const k of matchedKnowledge) {
    parts.push(`📍 **${k.title}**\n${k.content}`);
  }

  // Search courses by room, name, or instructor
  const matchedCourses = courses.filter(c =>
    matches(c.room, keywords) ||
    matches(c.name, keywords) ||
    matches(c.instructor, keywords)
  );

  if (matchedCourses.length > 0) {
    const courseLines = matchedCourses.map(c => {
      const time = `${c.startTime} - ${c.endTime}`;
      const section = c.section ? ` | شعبة ${c.section}` : "";
      return `• **${c.name}** — د. ${c.instructor}\n  📅 ${c.day} | ⏰ ${time} | 🚪 قاعة ${c.room}${section}`;
    }).join("\n\n");

    parts.push(`📚 **محاضرات مرتبطة:**\n${courseLines}`);
  }

  if (parts.length === 0) {
    res.json({
      reply: "ما وجدت معلومات عن هذا البحث. حاولي تكتبين رقم القاعة أو اسم المادة أو اسم الدكتورة بشكل أوضح 🔍"
    });
    return;
  }

  res.json({ reply: parts.join("\n\n---\n\n") });
});

export default router;
