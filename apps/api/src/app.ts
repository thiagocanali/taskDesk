import express, { type Request, type Response } from "express";

export function createApp() {
  const app = express();

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
    response.status(200).json({
      name: "taskDesk API",
      version: "v1",
      status: "available",
    });
  });

  return app;
}
