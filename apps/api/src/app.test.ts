import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import type { TaskRepository } from "./tasks/task.types.js";

function createRepository(overrides:Partial<TaskRepository>={}):TaskRepository {
 return {
  list:async()=>[],
  findById:async()=>null,
  listActivities:async()=>[],
  create:async()=>{throw new Error("secret task content should not be logged");},
  update:async()=>null,
  delete:async()=>false,
  ...overrides,
 };
}

describe("createApp",()=>{
 afterEach(()=>vi.restoreAllMocks());

 it("returns security headers and does not cache API responses",async()=>{
  const response=await request(createApp({authenticate:async()=>({id:"test-user"}),taskRepository:createRepository()})).get("/health");
  expect(response.status).toBe(200);
  expect(response.headers["x-content-type-options"]).toBe("nosniff");
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.headers["x-powered-by"]).toBeUndefined();
 });

 it("returns a generic error without logging the underlying error message",async()=>{
  const errorSpy=vi.spyOn(console,"error").mockImplementation(()=>undefined);
  const response=await request(createApp({authenticate:async()=>({id:"test-user"}),taskRepository:createRepository()}))
   .post("/api/v1/tasks")
   .send({title:"Tarefa válida"});

  expect(response.status).toBe(500);
  expect(response.body).toEqual({error:"Não foi possível concluir a operação."});
  expect(errorSpy).toHaveBeenCalledWith("Unhandled API error");
  expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("secret task content"));
 });

 it("rejects oversized JSON as a client error without logging task data",async()=>{
  const errorSpy=vi.spyOn(console,"error").mockImplementation(()=>undefined);
  const response=await request(createApp({authenticate:async()=>({id:"test-user"}),taskRepository:createRepository()}))
   .post("/api/v1/tasks").send({title:"x".repeat(110000)});
  expect(response.status).toBe(413);
  expect(response.body).toEqual({error:"O corpo da requisição excede o limite permitido."});
  expect(errorSpy).not.toHaveBeenCalled();
 });

 it("rejects malformed JSON with a safe client error",async()=>{
  const response=await request(createApp({authenticate:async()=>({id:"test-user"}),taskRepository:createRepository()}))
   .post("/api/v1/tasks")
   .set("Content-Type","application/json")
   .send('{"title":');

  expect(response.status).toBe(400);
  expect(response.body).toEqual({error:"O corpo da requisição contém JSON inválido."});
 });
});
