import request from "supertest";
import { EventEmitter } from "node:events";
import type { Request, Response } from "express";
import { requestObservability } from "./observability.js";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import type { RequestLog } from "./observability.js";
import type { TaskRepository } from "./tasks/task.types.js";
import { AuthenticationUnavailable } from "./auth/authentication.js";

describe("privacy-preserving request diagnostics",()=>{
 it("records aborted responses once without reporting a successful status",()=>{
  const entries:RequestLog[]=[];
  const response=Object.assign(new EventEmitter(),{setHeader:vi.fn(),statusCode:200,writableFinished:false});
  requestObservability(e=>entries.push(e))({method:"GET",route:{path:"/health"}} as unknown as Request,response as unknown as Response,vi.fn());
  response.emit("close");response.emit("finish");
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({outcome:"aborted",status:null});
 });
 it("emits a parseable structured event with the default logger",async()=>{
  const sink=vi.spyOn(console,"info").mockImplementation(()=>{});
  try {
   await request(createApp({authenticate:async()=>null})).get("/health");
   expect(sink).toHaveBeenCalledOnce();
   expect(JSON.parse(sink.mock.calls[0][0])).toMatchObject({event:"http_request",route:"/health",status:200});
  } finally { sink.mockRestore(); }
 });
 it("generates a unique server ID instead of reflecting a caller ID",async()=>{
  const entries:RequestLog[]=[];
  const app=createApp({authenticate:async()=>null,requestLogger:e=>entries.push(e)});
  const first=await request(app).get("/health").set("X-Request-ID","untrusted-secret");
  const second=await request(app).get("/health").set("X-Request-ID",first.headers["x-request-id"]);
  expect(first.headers["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
  expect(second.headers["x-request-id"]).not.toBe(first.headers["x-request-id"]);
  expect(entries).toHaveLength(2);
  expect(entries[0].requestId).toBe(first.headers["x-request-id"]);
 });
 it("logs status and duration without raw path, query, headers or body",async()=>{
  const entries:RequestLog[]=[];
  const app=createApp({authenticate:async()=>null,requestLogger:e=>entries.push(e)});
  await request(app).post("/unknown-private-user?email=private-email")
   .set("Authorization","Bearer private-token").set("Cookie","secret-cookie=value")
   .send({password:"private-password",title:"private-title"});
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({event:"http_request",method:"POST",route:"unmatched",status:404,outcome:"completed"});
  expect(entries[0].durationMs).toBeGreaterThanOrEqual(0);
  expect(Object.keys(entries[0]).sort()).toEqual(["durationMs","event","method","outcome","requestId","route","status"]);
  expect(JSON.stringify(entries)).not.toMatch(/private-|secret-cookie/);
 });
 it.each([["missing",401],["provider",503]] as const)("correlates %s authentication failures without changing their body",async(mode,status)=>{
  const entries:RequestLog[]=[];
  const app=createApp({authenticate:async()=>{if(mode==="provider")throw new AuthenticationUnavailable();return null;},requestLogger:e=>entries.push(e)});
  const result=await request(app).get("/api/v1/tasks");
  expect(result.status).toBe(status);
  expect(result.headers["x-request-id"]).toBe(entries[0].requestId);
  expect(entries[0].status).toBe(status);
  expect(result.body).not.toHaveProperty("requestId");
 });
 it("includes diagnostics even when JSON parsing fails",async()=>{
  const entries:RequestLog[]=[];
  const app=createApp({authenticate:async()=>null,requestLogger:e=>entries.push(e)});
  const result=await request(app).post("/api/v1/tasks").set("Content-Type","application/json").send('{"password":"private-secret"');
  expect(result.status).toBe(400);
  expect(result.headers["x-request-id"]).toBe(entries[0].requestId);
  expect(entries[0].status).toBe(400);
  expect(JSON.stringify(entries)).not.toContain("private-secret");
 });
 it("does not fail an otherwise healthy request when the log sink throws",async()=>{
  const app=createApp({authenticate:async()=>null,requestLogger:()=>{throw new Error("private sink error");}});
  expect((await request(app).get("/health")).status).toBe(200);
 });
 it("uses registered route templates rather than task identifiers",async()=>{
  const entries:RequestLog[]=[];
  const repository={findById:async()=>null};
  const app=createApp({authenticate:async()=>({id:"private-owner"}),taskRepository:repository as unknown as TaskRepository,requestLogger:e=>entries.push(e)});
  const result=await request(app).get("/api/v1/tasks/private-task-id");
  expect(result.status).toBe(404);
  expect(entries[0].route).toBe("/:id");
  expect(JSON.stringify(entries)).not.toMatch(/private-task-id|private-owner/);
 });
});
