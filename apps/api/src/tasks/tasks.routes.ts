import { z } from "zod";
import { Router, type Request, type Response } from "express";
import type { TaskRepository } from "./task.types.js";

import {
  createTaskSchema,
  taskFilterSchema,
  updateTaskSchema,
} from "./task.schemas.js";

function getTaskId(request: Request): string {
  const id = request.params.id;
  return Array.isArray(id) ? (id[0] ?? "") : id;
}

export function createTasksRouter(repository: TaskRepository): Router {
  const router = Router();

  router.get("/", async (request: Request, response: Response) => {
    const filters = taskFilterSchema.safeParse(request.query);
    if (!filters.success) {
      response.status(400).json({
        error: "Filtros inválidos.",
        details: z.flattenError(filters.error),
      });
      return;
    }

    response.status(200).json({ data: await repository.list(filters.data) });
  });

  router.post("/", async (request: Request, response: Response) => {
    const input = createTaskSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({
        error: "Dados da tarefa inválidos.",
        details: z.flattenError(input.error),
      });
      return;
    }

    const task = await repository.create(input.data);
    response.status(201).json({ data: task });
  });

  router.get("/:id/activities", async (request: Request, response: Response) => {
    const id = getTaskId(request);
    if (!(await repository.findById(id))) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }
    response.status(200).json({ data: await repository.listActivities(id) });
  });

  router.get("/:id", async (request: Request, response: Response) => {
    const task = await repository.findById(getTaskId(request));
    if (!task) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }

    response.status(200).json({ data: task });
  });

  router.patch("/:id", async (request: Request, response: Response) => {
    const input = updateTaskSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({
        error: "Dados da tarefa inválidos.",
        details: z.flattenError(input.error),
      });
      return;
    }

    const taskId = getTaskId(request);
    const task = await repository.update(taskId, input.data);
    if (!task) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }

    response.status(200).json({ data: task });
  });

  router.delete("/:id", async (request: Request, response: Response) => {
    if (!(await repository.delete(getTaskId(request)))) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }

    response.status(204).send();
  });

  return router;
}
