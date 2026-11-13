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
  constructor(private readonly prisma: PrismaClient, private readonly ownerId: string) {}

  async list(filters: ListTaskFilters): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: { status: filters.status, priority: filters.priority, ownerId: this.ownerId },
      ...(filters.page !== undefined || filters.limit !== undefined ? { skip: ((filters.page ?? 1) - 1) * (filters.limit ?? 50), take: filters.limit ?? 50 } : {}),
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }, { id: "asc" }],
    });
  }

  async count(filters: ListTaskFilters): Promise<number> {
    return this.prisma.task.count({
      where: { ownerId: this.ownerId, status: filters.status, priority: filters.priority },
    });
  }

  async summary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 8);
    const ownerId = this.ownerId;
    const incomplete = { status: { not: "COMPLETED" as const } };
    const [total, inProgress, waiting, completed, overdue, dueSoon] = await Promise.all([
      this.prisma.task.count({ where: { ownerId } }),
      this.prisma.task.count({ where: { ownerId, status: "IN_PROGRESS" } }),
      this.prisma.task.count({ where: { ownerId, status: "WAITING" } }),
      this.prisma.task.count({ where: { ownerId, status: "COMPLETED" } }),
      this.prisma.task.count({ where: { ownerId, ...incomplete, dueAt: { lt: today } } }),
      this.prisma.task.count({ where: { ownerId, ...incomplete, dueAt: { gte: today, lt: nextWeek } } }),
    ]);
    return { total, inProgress, waiting, completed, overdue, dueSoon };
  }

  async findById(id: string): Promise<TaskRecord | null> {
    return this.prisma.task.findFirst({ where: { id, ownerId: this.ownerId } });
  }

  async listActivities(taskId: string): Promise<TaskActivityRecord[]> {
    return this.prisma.taskActivity.findMany({
      where: { taskId, task: { ownerId: this.ownerId } },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(input: CreateTaskInput): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        ...input,
        ownerId: this.ownerId,
        activities: { create: { type: "CREATED", message: "Tarefa criada." } },
      },
    });
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskRecord | null> {
    // Retry PostgreSQL serialization conflicts; each attempt reads a fresh snapshot.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async transaction => {
          const before = await transaction.task.findFirst({ where: { id, ownerId: this.ownerId } });
          if (!before) return null;

          const task = await transaction.task.update({ where: { id, ownerId: this.ownerId }, data: input });
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
    const result = await this.prisma.task.deleteMany({ where: { id, ownerId: this.ownerId } });
    return result.count > 0;
  }
}
