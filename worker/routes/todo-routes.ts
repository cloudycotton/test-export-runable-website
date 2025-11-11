import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authenticatedOnly } from "../middleware/auth";
import type { HonoContext } from "../types";
import { todos } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
});

export const todoRoutes = new Hono<HonoContext>()
  .use("*", authenticatedOnly)
  .get("/", async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userTodos = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, user.id))
      .orderBy(desc(todos.createdAt));

    return c.json(userTodos);
  })
  .post("/", zValidator("json", createTodoSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { title } = c.req.valid("json");

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(todos).values({
      id,
      userId: user.id,
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });

    const newTodo = await db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);

    return c.json(newTodo[0], 201);
  })
  .patch("/:id", zValidator("json", updateTodoSchema), async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const id = c.req.param("id");
    const updates = c.req.valid("json");

    const todo = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .limit(1);

    if (!todo.length) {
      return c.json({ error: "Todo not found" }, 404);
    }

    await db
      .update(todos)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(todos.id, id));

    const updatedTodo = await db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);

    return c.json(updatedTodo[0]);
  })
  .delete("/:id", async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const id = c.req.param("id");

    const todo = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .limit(1);

    if (!todo.length) {
      return c.json({ error: "Todo not found" }, 404);
    }

    await db.delete(todos).where(eq(todos.id, id));

    return c.json({ success: true });
  })
  .delete("/completed", async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await db
      .delete(todos)
      .where(and(eq(todos.userId, user.id), eq(todos.completed, true)));

    return c.json({ success: true });
  });
