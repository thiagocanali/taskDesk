import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { createAuthenticator } from "./authentication.js";
import type { TaskRepository } from "../tasks/task.types.js";

const owner = "11111111-1111-4111-8111-111111111111";
const repository = {
 list: vi.fn(async () => []), count: vi.fn(async () => 0), findById: async () => null, listActivities: async () => [],
 create: async () => { throw new Error(); }, update: async () => null, delete: async () => false,
} satisfies TaskRepository;
const env = {SUPABASE_URL:"https://auth.example.test", SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test"};

describe("authentication boundary", () => {
 afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
 it("denies anonymous, malformed and invalid bearer tokens before reading tasks", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({msg:"Invalid JWT",code:"bad_jwt"}), {status:401}));
  vi.stubGlobal("fetch", fetchMock);
  const app = createApp({taskRepository:repository, authenticate:createAuthenticator(env)});
  expect((await request(app).get("/api/v1/tasks")).status).toBe(401);
  expect((await request(app).get("/api/v1/tasks").set("Authorization","Basic abc")).status).toBe(401);
  expect((await request(app).get("/api/v1/tasks").set("Authorization","Bearer invalid")).status).toBe(401);
  expect(repository.list).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
 });
 it("uses the verified user identity, never supplied ownership metadata", async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({id:owner,is_anonymous:false,user_metadata:{ownerId:"attacker"}}),{status:200})));
  const factory=vi.fn(()=>repository);
  const app=createApp({repositoryForUser:factory,authenticate:createAuthenticator(env)});
  expect((await request(app).get("/api/v1/tasks").set("Authorization","Bearer verified-token")).status).toBe(200);
  expect(factory).toHaveBeenCalledWith(owner);
 });
 it("fails closed when auth is missing or unavailable and keeps health available",async()=>{
  const missing=createApp({taskRepository:repository,authenticate:createAuthenticator({})});
  expect((await request(missing).get("/api/v1/tasks")).status).toBe(503);
  expect((await request(missing).get("/health")).status).toBe(200);
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('{}',{status:503})));
  const unavailable=createApp({taskRepository:repository,authenticate:createAuthenticator(env)});
  expect((await request(unavailable).get("/api/v1/tasks").set("Authorization","Bearer token")).status).toBe(503);
  expect(repository.list).not.toHaveBeenCalled();
 });
 it("rejects Supabase anonymous accounts",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({id:owner,is_anonymous:true}),{status:200})));
  const app=createApp({taskRepository:repository,authenticate:createAuthenticator(env)});
  expect((await request(app).get("/api/v1/tasks").set("Authorization","Bearer token")).status).toBe(401);
 });
 it("forbids development bypass in production or Vercel",()=>{
  expect(()=>createAuthenticator({AUTH_MODE:"local",NODE_ENV:"production"})).toThrow();
  expect(()=>createAuthenticator({AUTH_MODE:"local",NODE_ENV:"development",VERCEL:"1"})).toThrow();
  expect(()=>createAuthenticator({AUTH_MODE:"local",NODE_ENV:"development"})).not.toThrow();
 });
});
