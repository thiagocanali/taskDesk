import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaTaskRepository } from "./prisma-task.repository.js";

// Use only a disposable database; migrations must be applied before this suite.
describe.skipIf(!process.env.TEST_DATABASE_URL)("Prisma task persistence", () => {
 const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
 const repository = new PrismaTaskRepository(prisma);
 const ids: string[] = [];
 const title = `integration-${randomUUID()}`;
 afterAll(async () => {
  await prisma.task.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
 });
 async function create() {
  const task = await repository.create({title});
  ids.push(task.id);
  return task;
 }
 it("persists creation, changed fields, no-op history and cascading deletion", async () => {
  const task = await create();
  expect(await repository.listActivities(task.id)).toHaveLength(1);
  await repository.update(task.id, {status:"WAITING", priority:"HIGH"});
  const history = await repository.listActivities(task.id);
  expect(history.map(activity => activity.message)).toEqual(expect.arrayContaining([
   "Tarefa criada.", "Status: Nova → Aguardando retorno", "Prioridade: Normal → Alta",
  ]));
  await repository.update(task.id, {status:"WAITING", priority:"HIGH"});
  expect(await repository.listActivities(task.id)).toHaveLength(3);
  await repository.delete(task.id);
  expect(await repository.listActivities(task.id)).toEqual([]);
  expect(await repository.update(task.id, {status:"COMPLETED"})).toBeNull();
 });
 it("rolls back task updates when writing activity fails", async () => {
  const task = await create();
  // A real database trigger forces failure inside the transaction, not a mocked repository.
  const functionName = `reject_activity_${randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(`CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."taskId" = '${task.id}' THEN RAISE EXCEPTION 'test activity failure'; END IF; RETURN NEW; END $$`);
  try {
   await prisma.$executeRawUnsafe(`CREATE TRIGGER "${functionName}" BEFORE INSERT ON "TaskActivity" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`);
   await expect(repository.update(task.id, {status:"COMPLETED"})).rejects.toThrow();
   expect((await repository.findById(task.id))?.status).toBe("NEW");
   expect(await repository.listActivities(task.id)).toHaveLength(1);
  } finally {
   await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${functionName}" ON "TaskActivity"`);
   await prisma.$executeRawUnsafe(`DROP FUNCTION "${functionName}"()`);
  }
 });
 it("preserves both concurrent field updates and their history", async () => {
  const task = await create();
  await Promise.all([
   repository.update(task.id, {status:"IN_PROGRESS"}),
   repository.update(task.id, {priority:"URGENT"}),
  ]);
  expect(await repository.findById(task.id)).toMatchObject({status:"IN_PROGRESS", priority:"URGENT"});
  expect(await repository.listActivities(task.id)).toHaveLength(3);
 });
});
