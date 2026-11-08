import { Router, type Request, type Response } from "express";
import type { TaskRepository } from "./task.types.js";
import { createTaskSchema, taskFilterSchema, updateTaskSchema } from "./task.schemas.js";

export function createTasksRouter(repository: TaskRepository): Router {
  const router = Router();

  router.get("/", async (request: Request, response: Response) => {
    const filters = taskFilterSchema.safeParse(request.query);
    if (!filters.success) {
      response.status(400).json({ error: "Filtros inválidos.", details: filters.error.flatten() });
      return;
    }

    const tasks = await repository.list(filters.data);
    response.status(200).json({ data: tasks });
  });

  router.post("/", async (request: Request, response: Response) => {
    const input = createTaskSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: "Dados da tarefa inválidos.", details: input.error.flatten() });
      return;
    }

    const task = await repository.create(input.data);
    response.status(201).json({ data: task });
  });

  router.get("/:id", async (request: Request, response: Response) => {
    const task = await repository.findById(request.params.id);
    if (!task) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }
    response.status(200).json({ data: task });
  });

  router.patch("/:id", async (request: Request, response: Response) => {
    const input = updateTaskSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: "Dados da tarefa inválidos.", details: input.error.flatten() });
      return;
    }

    const task = await repository.update(request.params.id, input.data);
    if (!task) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }
    response.status(200).json({ data: task });
  });

  router.delete("/:id", async (request: Request, response: Response) => {
    const deleted = await repository.delete(request.params.id);
    if (!deleted) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }
    response.status(204).send();
  });

  return router;
}
