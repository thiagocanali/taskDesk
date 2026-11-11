import express, { type ErrorRequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import { createAuthenticator, AuthenticationUnavailable, type Authenticate } from "./auth/authentication.js";
import { PrismaTaskRepository } from "./tasks/prisma-task.repository.js";
import { createTasksRouter } from "./tasks/tasks.routes.js";
import type { TaskRepository } from "./tasks/task.types.js";

export interface AppOptions {
  taskRepository?: TaskRepository;
  repositoryForUser?: (userId: string) => TaskRepository;
  authenticate?: Authenticate;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const prisma = options.taskRepository || options.repositoryForUser ? null : new PrismaClient();
  const authenticate = options.authenticate ?? createAuthenticator();
  const repositoryForUser = options.repositoryForUser ?? ((userId: string) =>
    options.taskRepository ?? new PrismaTaskRepository(prisma!, userId));

  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.get("/health", (_request, response) => response.status(200).json({
    status: "ok", service: "taskdesk-api", timestamp: new Date().toISOString(),
  }));
  app.get("/api/v1", (_request, response) => response.status(200).json({
    name: "taskDesk API", version: "v1", status: "available",
  }));
  app.use("/api/v1/tasks", async (request, response, next) => {
    const identity = await authenticate(request);
    if (!identity) {
      response.status(401).json({ error: "Entre na sua conta para continuar." });
      return;
    }
    return createTasksRouter(repositoryForUser(identity.id))(request, response, next);
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof AuthenticationUnavailable) {
      response.status(503).json({ error: "O acesso está temporariamente indisponível." });
      return;
    }
    if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
      response.status(413).json({ error: "O corpo da requisição excede o limite permitido." });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "O corpo da requisição contém JSON inválido." });
      return;
    }
    console.error("Unhandled API error");
    response.status(500).json({ error: "Não foi possível concluir a operação." });
  };
  app.use(errorHandler);
  return app;
}
