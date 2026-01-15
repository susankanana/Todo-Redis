import { Request, Response } from "express";
import {
  createTodoService,
  getTodoService,
  getTodoByIdService,
  getTodosByUserIdService,
  updateTodoService,
  deleteTodoService,
} from "./todo.service";

// CREATE TODO
export const createTodoController = async (req: Request, res: Response) => {
  try {
    const todo = req.body;
    if (todo.dueDate) todo.dueDate = new Date(todo.dueDate);

    const newTodo = await createTodoService(todo);
    return res.status(201).json({
      message: "Todo created successfully",
      todo: newTodo,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// GET ALL TODOS
export const getTodoController = async (req: Request, res: Response) => {
  try {
    const todos = await getTodoService();
    if (!todos || todos.length === 0)
      return res.status(404).json({ message: "No todos found" });

    return res.status(200).json({ data: todos });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// GET TODO BY ID
export const getTodoByIdController = async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const todo = await getTodoByIdService(id);
    if (!todo) return res.status(404).json({ message: "Todo not found" });

    return res.status(200).json({ data: todo });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// UPDATE TODO
export const updateTodoController = async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const todo = req.body;
    if (todo.dueDate) todo.dueDate = new Date(todo.dueDate);

    await updateTodoService(id, todo);
    return res.status(200).json({ message: "Todo updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// DELETE TODO
export const deleteTodoController = async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    await deleteTodoService(id);
    return res.status(204).json({ message: "Todo deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// GET TODOS BY USER
export const getTodosByUserIdController = async (req: Request, res: Response) => {
  try {
    // const userId = (req as any).user.id; //ID of logged in user. Comes directly from your JWT, stored in req.user by your checkRoles middleware.
    const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid User ID" });

    const todos = await getTodosByUserIdService(userId);
    if (!todos || todos.length === 0)
      return res.status(404).json({ message: "No todos found for this user" });

    return res.status(200).json({ data: todos });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
