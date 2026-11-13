import request from "supertest";
import { createApp } from "../app.js";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "../database/prisma.js";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaTaskRepository } from "./prisma-task.repository.js";

// Use only a disposable database; migrations must be applied before this suite.
describe.skipIf(!process.env.TEST_DATABASE_URL)("Prisma task persistence", () => {
 const prisma = createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const repository = new PrismaTaskRepository(prisma, randomUUID());
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
 it("isolates every HTTP task operation between users and quarantines legacy rows", async () => {
  const alice = randomUUID();
  const bob = randomUUID();
  const app = createApp({
   authenticate: async req => {
    const token = req.get("Authorization");
    return token === "Bearer alice" ? {id:alice} : token === "Bearer bob" ? {id:bob} : null;
   },
   repositoryForUser: userId => new PrismaTaskRepository(prisma,userId),
  });
  const created=await request(app).post("/api/v1/tasks").set("Authorization","Bearer alice").send({title});
  expect(created.status).toBe(201);
  const id=created.body.data.id as string;
  ids.push(id);
  const legacy=await prisma.task.create({data:{title}});
  ids.push(legacy.id);
  expect((await request(app).get("/api/v1/tasks")).status).toBe(401);
  for(const token of ["alice","bob"]){
   const list=await request(app).get("/api/v1/tasks").set("Authorization",`Bearer ${token}`);
   expect(list.body.data.map((task: {id:string})=>task.id)).toEqual(token==="alice"?[id]:[]);
   expect((await request(app).get(`/api/v1/tasks/${legacy.id}`).set("Authorization",`Bearer ${token}`)).status).toBe(404);
  }
  const alicePage=await request(app).get("/api/v1/tasks?page=1&limit=1").set("Authorization","Bearer alice");
  const bobPage=await request(app).get("/api/v1/tasks?page=1&limit=1").set("Authorization","Bearer bob");
  expect(alicePage.body.pagination).toEqual({page:1,limit:1,total:1,totalPages:1});
  expect(alicePage.body.data.map((task: {id:string})=>task.id)).toEqual([id]);
  expect(bobPage.body.pagination).toEqual({page:1,limit:1,total:0,totalPages:0});
  expect(bobPage.body.data).toEqual([]);
  for(const suffix of ["", "/activities"]){
   expect((await request(app).get(`/api/v1/tasks/${id}${suffix}`).set("Authorization","Bearer bob")).status).toBe(404);
  }
  expect((await request(app).patch(`/api/v1/tasks/${id}`).set("Authorization","Bearer bob").send({status:"COMPLETED"})).status).toBe(404);
  expect((await request(app).delete(`/api/v1/tasks/${id}`).set("Authorization","Bearer bob")).status).toBe(404);
  expect((await request(app).patch(`/api/v1/tasks/${id}`).set("Authorization","Bearer alice").send({ownerId:bob})).status).toBe(400);
  expect((await request(app).patch(`/api/v1/tasks/${id}`).set("Authorization","Bearer alice").send({status:"COMPLETED"})).status).toBe(200);
  const history=await request(app).get(`/api/v1/tasks/${id}/activities`).set("Authorization","Bearer alice");
  expect(history.body.data).toHaveLength(2);
  expect((await request(app).delete(`/api/v1/tasks/${id}`).set("Authorization","Bearer alice")).status).toBe(204);
 });
 it("denies direct table reads to a non-privileged Data API style role",async()=>{
  await create();
  const role=`taskdesk_test_${randomUUID().replaceAll("-","")}`;
  await prisma.$executeRawUnsafe(`CREATE ROLE "${role}" NOLOGIN`);
  try {
   await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`);
   await prisma.$executeRawUnsafe(`GRANT SELECT ON "Task", "TaskActivity", "_prisma_migrations" TO "${role}"`);
   await prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`);
    expect(await tx.task.findMany()).toEqual([]);
    expect(await tx.taskActivity.findMany()).toEqual([]);
    expect(await tx.$queryRaw`SELECT * FROM "_prisma_migrations"`).toEqual([]);
   });
  } finally {
   await prisma.$executeRawUnsafe(`DROP OWNED BY "${role}"`);
   await prisma.$executeRawUnsafe(`DROP ROLE "${role}"`);
  }
 });

});
