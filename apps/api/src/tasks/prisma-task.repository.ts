import {
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { activityMessage } from "./task-activity.js";
import type {
  CreateTaskInput,
  ListTaskFilters,
  TaskActivityRecord,
  TaskRecord,
  TaskRepository,
  UpdateTaskInput,
} from "./task.types.js";

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: ListTaskFilters): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: filters,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }

  async findById(id: string): Promise<TaskRecord | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  async listActivities(taskId: string): Promise<TaskActivityRecord[]> {
    return this.prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(input: CreateTaskInput): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        ...input,
        activities: { create: { type: "CREATED", message: "Tarefa criada." } },
      },
    });
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskRecord | null> {
    // Retry PostgreSQL serialization conflicts; each attempt reads a fresh snapshot.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async transaction => {
          const before = await transaction.task.findUnique({ where: { id } });
          if (!before) return null;

          const task = await transaction.task.update({ where: { id }, data: input });
          const activities = (Object.keys(input) as (keyof UpdateTaskInput)[])
            .map(field => activityMessage(field, before, task))
            .filter((message): message is string => message !== null)
            .map(message => ({ taskId: id, type: "FIELD_UPDATED", message }));
          if (activities.length) {
            await transaction.taskActivity.createMany({ data: activities });
          }
          return task;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2034" || attempt >= 2
        ) throw error;
      }
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.task.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
