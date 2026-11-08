import { PrismaClient, type TaskPriority as PrismaTaskPriority, type TaskStatus as PrismaTaskStatus } from "@prisma/client";
import type {
  CreateTaskInput,
  ListTaskFilters,
  TaskRecord,
  TaskRepository,
  UpdateTaskInput,
} from "./task.types.js";

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: ListTaskFilters): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: {
        ...(filters.status ? { status: filters.status as PrismaTaskStatus } : {}),
        ...(filters.priority ? { priority: filters.priority as PrismaTaskPriority } : {}),
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }

  async findById(id: string): Promise<TaskRecord | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  async create(input: CreateTaskInput): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: (input.priority ?? "NORMAL") as PrismaTaskPriority,
        dueAt: input.dueAt,
        origin: input.origin,
      },
    });
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskRecord | null> {
    const existing = await this.prisma.task.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return null;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...input,
        ...(input.status ? { status: input.status as PrismaTaskStatus } : {}),
        ...(input.priority ? { priority: input.priority as PrismaTaskPriority } : {}),
      },
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.task.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
