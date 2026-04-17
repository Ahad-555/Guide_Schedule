import { Router } from "express";
import { db, assistantKnowledgeTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

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

router.post("/assistant/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const [courses, knowledge] = await Promise.all([
    db.select().from(coursesTable),
    db.select().from(assistantKnowledgeTable),
  ]);

  const coursesText = courses.map(c =>
    `- ${c.name} | د. ${c.instructor} | ${c.college} | ${c.day} ${c.startTime}-${c.endTime} | قاعة ${c.room}${c.section ? ` | شعبة ${c.section}` : ""}`
  ).join("\n");

  const knowledgeText = knowledge.length > 0
    ? knowledge.map(k => `### ${k.title}\n${k.content}`).join("\n\n")
    : "لا توجد معلومات إضافية متاحة حالياً.";

  const systemPrompt = `أنتِ مساعدة ذكية لدليل كلية إدارة الأعمال (MIS) في جامعة سعودية. تساعدين الطالبات في إيجاد قاعاتهن ومعلومات عن المحاضرات والكليات.

## جدول المحاضرات المتاح:
${coursesText}

## معلومات إضافية عن القاعات والمباني:
${knowledgeText}

## تعليمات:
- أجيبي بالعربية دائماً
- كوني مختصرة ومفيدة
- إذا سألتك الطالبة عن قاعة أو مادة، أعطيها المعلومات المباشرة من الجدول
- إذا لم تجدي المعلومة، قولي ذلك بوضوح
- لا تخترعي معلومات غير موجودة في البيانات أعلاه`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "عذراً، لم أتمكن من الإجابة.";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "فشل الاتصال بالمساعد الذكي" });
  }
});

export default router;
