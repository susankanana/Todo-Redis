import { sql } from "drizzle-orm";
import redisClient from "../redis/client";
import db from "../drizzle/db";
import { TodoTable, TITodo } from "../drizzle/schema";

/* ------------------------------------------------------------------
   Cache helpers
-------------------------------------------------------------------*/
const TODOS_CACHE_KEY = "todos:all";

export const getTodoCache = async () => {
  const cached = await redisClient.get(TODOS_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  return null;
};

export const setTodoCache = async (todos: any) => {
  await redisClient.set(TODOS_CACHE_KEY, JSON.stringify(todos), "EX", 300); // 5 mins
};

export const invalidateTodoCache = async () => {
  await redisClient.del(TODOS_CACHE_KEY);
};

/* ------------------------------------------------------------------
   Todo CRUD Services
-------------------------------------------------------------------*/

// Fetch all todos with caching
export const getTodoService = async () => {
  const cachedTodos = await getTodoCache();
  if (cachedTodos) return cachedTodos;

  const todos = await db.query.TodoTable.findMany();
  await setTodoCache(todos);
  return todos;
};

// Fetch todo by id
export const getTodoByIdService = async (id: number) => {
  const todo = await db.query.TodoTable.findFirst({
    where: sql`${TodoTable.id} = ${id}`,
  });
  return todo;
};

// Fetch all todos by user
export const getTodosByUserIdService = async (userId: number) => {
  const todos = await db.query.TodoTable.findMany({
    where: sql`${TodoTable.userId} = ${userId}`,
  });
  return todos;
};

// Create a todo
export const createTodoService = async (todo: TITodo) => {
  const [inserted] = await db.insert(TodoTable).values(todo).returning();
  await invalidateTodoCache();
  return inserted;
};

// Update a todo
export const updateTodoService = async (id: number, todo: TITodo) => {
  await db.update(TodoTable).set(todo).where(sql`${TodoTable.id} = ${id}`);
  await invalidateTodoCache();
  return "Todo updated successfully";
};

// Delete a todo
export const deleteTodoService = async (id: number) => {
  await db.delete(TodoTable).where(sql`${TodoTable.id} = ${id}`);
  await invalidateTodoCache();
  return "Todo deleted successfully";
};
