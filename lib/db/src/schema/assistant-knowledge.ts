import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const assistantKnowledgeTable = pgTable("assistant_knowledge", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

export type AssistantKnowledge = typeof assistantKnowledgeTable.$inferSelect;
export type InsertAssistantKnowledge = typeof assistantKnowledgeTable.$inferInsert;
