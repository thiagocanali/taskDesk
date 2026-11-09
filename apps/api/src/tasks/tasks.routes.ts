import { Router, type Request, type Response } from "express";
import type { TaskRecord, TaskRepository, TaskStatus, TaskPriority } from "./task.types.js";

const statusLabels: Record<TaskStatus, string> = {
  NEW: "Nova",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando retorno",
  COMPLETED: "Concluída",
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

function activityMessage(field: keyof TaskRecord, before: TaskRecord, after: TaskRecord): string | null {
  const previous = before[field];
  const next = after[field];
  if (previous instanceof Date || next instanceof Date) {
    const previousTime = previous instanceof Date ? previous.getTime() : previous;
    const nextTime = next instanceof Date ? next.getTime() : next;
    if (previousTime === nextTime) return null;
  } else if (previous === next) {
    return null;
  }

  if (field === "status") {
    return `Status: ${statusLabels[before.status]} → ${statusLabels[after.status]}`;
  }
  if (field === "priority") {
    return `Prioridade: ${priorityLabels[before.priority]} → ${priorityLabels[after.priority]}`;
  }
  if (field === "title") {
    return `Título alterado: “${before.title}” → “${after.title}”`;
  }
  if (field === "dueAt") {
    const formatDate = (value: Date | null) => value ? value.toISOString().slice(0, 10) : "Sem prazo";
    return `Prazo: ${formatDate(before.dueAt)} → ${formatDate(after.dueAt)}`;
  }
  if (field === "description") return "Descrição atualizada.";
  if (field === "origin") return "Origem atualizada.";
  return null;
}
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
        details: filters.error.flatten(),
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
        details: input.error.flatten(),
      });
      return;
    }

    const task = await repository.create(input.data);
    await repository.addActivity(task.id, "CREATED", "Tarefa criada.");
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
        details: input.error.flatten(),
      });
      return;
    }

    const taskId = getTaskId(request);
    const before = await repository.findById(taskId);
    const task = await repository.update(taskId, input.data);
    if (!task) {
      response.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }

    if (before) {
      const changedFields = Object.keys(input.data) as (keyof TaskRecord)[];
      for (const field of changedFields) {
        const message = activityMessage(field, before, task);
        if (message) await repository.addActivity(task.id, "FIELD_UPDATED", message);
      }
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
