import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaTaskRepository } from "./tasks/prisma-task.repository.js";
import { createTasksRouter } from "./tasks/tasks.routes.js";
import type { TaskRepository } from "./tasks/task.types.js";

export interface AppOptions {
  taskRepository?: TaskRepository;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const prisma = options.taskRepository ? null : new PrismaClient();
  const repository = options.taskRepository ?? new PrismaTaskRepository(prisma!);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request: Request, response: Response) => {
    response.status(200).json({
      status: "ok",
      service: "taskdesk-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/v1", (_request: Request, response: Response) => {
    response.status(200).json({ name: "taskDesk API", version: "v1", status: "available" });
  });

  app.use("/api/v1/tasks", createTasksRouter(repository));

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "O corpo da requisição contém JSON inválido." });
      return;
    }
    console.error("Unhandled API error", error instanceof Error ? error.message : "Unknown error");
    response.status(500).json({ error: "Não foi possível concluir a operação." });
  };
  app.use(errorHandler);

  return app;
}
