import { Router } from "express";
import { db, assistantKnowledgeTable } from "@workspace/db";
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
    res.json({ reply: "اكتبي اسم القاعة أو رقمها وسأخبرك وين هي 😊" });
    return;
  }

  const knowledge = await db.select().from(assistantKnowledgeTable);

  const matched = knowledge.filter(k =>
    matches(k.title, keywords) || matches(k.content, keywords)
  );

  if (matched.length === 0) {
    res.json({
      reply: "ما وجدت معلومات عن هذه القاعة. جربي تكتبين رقمها أو اسمها بشكل أوضح 🔍"
    });
    return;
  }

  const reply = matched
    .map(k => `📍 **${k.title}**\n${k.content}`)
    .join("\n\n---\n\n");

  res.json({ reply });
});

export default router;
