import { Router } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import {
  ListCoursesQueryParams,
  CreateCourseBody,
  GetCourseParams,
  UpdateCourseParams,
  UpdateCourseBody,
  DeleteCourseParams,
  BulkCreateCoursesBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/courses", async (req, res) => {
  const parse = ListCoursesQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: parse.error });
    return;
  }
  const { college, day, search } = parse.data;

  let query = db.select().from(coursesTable);

  const conditions = [];
  if (college) {
    conditions.push(eq(coursesTable.college, college));
  }
  if (day) {
    conditions.push(eq(coursesTable.day, day));
  }
  if (search) {
    conditions.push(
      or(
        ilike(coursesTable.name, `%${search}%`),
        ilike(coursesTable.instructor, `%${search}%`),
      )!,
    );
  }

  const results = conditions.length
    ? await query.where(conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => ({ ...a, ...b }) as any))
    : await query;

  res.json(results.map((c) => ({
    id: c.id,
    name: c.name,
    instructor: c.instructor,
    college: c.college,
    day: c.day,
    startTime: c.startTime,
    endTime: c.endTime,
    room: c.room,
    roomDescription: c.roomDescription ?? undefined,
    officeHours: c.officeHours ?? undefined,
    officeLocation: c.officeLocation ?? undefined,
  })));
});

router.post("/courses", async (req, res) => {
  const parse = CreateCourseBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error });
    return;
  }
  const data = parse.data;
  const [course] = await db.insert(coursesTable).values({
    name: data.name,
    instructor: data.instructor,
    college: data.college,
    day: data.day,
    startTime: data.startTime,
    endTime: data.endTime,
    room: data.room,
    roomDescription: data.roomDescription ?? null,
    officeHours: data.officeHours ?? null,
    officeLocation: data.officeLocation ?? null,
  }).returning();
  res.status(201).json({
    id: course.id,
    name: course.name,
    instructor: course.instructor,
    college: course.college,
    day: course.day,
    startTime: course.startTime,
    endTime: course.endTime,
    room: course.room,
    roomDescription: course.roomDescription ?? undefined,
    officeHours: course.officeHours ?? undefined,
    officeLocation: course.officeLocation ?? undefined,
  });
});

router.get("/courses/bulk", async (_req, res) => {
  res.status(405).json({ error: "Method not allowed" });
});

router.post("/courses/bulk", async (req, res) => {
  const parse = BulkCreateCoursesBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error });
    return;
  }
  await db.delete(coursesTable);
  const inserted = await db.insert(coursesTable).values(
    parse.data.courses.map((c) => ({
      name: c.name,
      instructor: c.instructor,
      college: c.college,
      day: c.day,
      startTime: c.startTime,
      endTime: c.endTime,
      room: c.room,
      roomDescription: c.roomDescription ?? null,
      officeHours: c.officeHours ?? null,
      officeLocation: c.officeLocation ?? null,
    }))
  ).returning();
  res.status(201).json({ count: inserted.length });
});

router.get("/courses/:id", async (req, res) => {
  const parse = GetCourseParams.safeParse({ id: Number(req.params.id) });
  if (!parse.success) {
    res.status(400).json({ error: parse.error });
    return;
  }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, parse.data.id));
  if (!course) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: course.id,
    name: course.name,
    instructor: course.instructor,
    college: course.college,
    day: course.day,
    startTime: course.startTime,
    endTime: course.endTime,
    room: course.room,
    roomDescription: course.roomDescription ?? undefined,
    officeHours: course.officeHours ?? undefined,
    officeLocation: course.officeLocation ?? undefined,
  });
});

router.put("/courses/:id", async (req, res) => {
  const paramParse = UpdateCourseParams.safeParse({ id: Number(req.params.id) });
  const bodyParse = UpdateCourseBody.safeParse(req.body);
  if (!paramParse.success || !bodyParse.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const data = bodyParse.data;
  const [updated] = await db.update(coursesTable).set({
    name: data.name,
    instructor: data.instructor,
    college: data.college,
    day: data.day,
    startTime: data.startTime,
    endTime: data.endTime,
    room: data.room,
    roomDescription: data.roomDescription ?? null,
    officeHours: data.officeHours ?? null,
    officeLocation: data.officeLocation ?? null,
  }).where(eq(coursesTable.id, paramParse.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: updated.id,
    name: updated.name,
    instructor: updated.instructor,
    college: updated.college,
    day: updated.day,
    startTime: updated.startTime,
    endTime: updated.endTime,
    room: updated.room,
    roomDescription: updated.roomDescription ?? undefined,
    officeHours: updated.officeHours ?? undefined,
    officeLocation: updated.officeLocation ?? undefined,
  });
});

router.delete("/courses/:id", async (req, res) => {
  const parse = DeleteCourseParams.safeParse({ id: Number(req.params.id) });
  if (!parse.success) {
    res.status(400).json({ error: parse.error });
    return;
  }
  await db.delete(coursesTable).where(eq(coursesTable.id, parse.data.id));
  res.status(204).send();
});

export default router;
