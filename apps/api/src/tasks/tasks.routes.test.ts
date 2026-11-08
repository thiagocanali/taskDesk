import { describe,expect,it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import type { CreateTaskInput,ListTaskFilters,TaskActivityRecord,TaskRecord,TaskRepository,UpdateTaskInput } from "./task.types.js";
class InMemoryTaskRepository implements TaskRepository {
 private tasks:TaskRecord[]=[];
 private activities:TaskActivityRecord[]=[];
 private sequence=0;
 async list(filters:ListTaskFilters):Promise<TaskRecord[]> {
  return this.tasks.filter(task=>(!filters.status||task.status===filters.status)&&(!filters.priority||task.priority===filters.priority));
 }
 async listActivities(taskId:string):Promise<TaskActivityRecord[]>{return this.activities.filter(activity=>activity.taskId===taskId);}
 async addActivity(taskId:string,type:string,message:string):Promise<TaskActivityRecord>{const activity={id:`activity-${this.activities.length+1}`,taskId,type,message,createdAt:new Date()};this.activities.push(activity);return activity;}
 async findById(id:string):Promise<TaskRecord|null>{return this.tasks.find(task=>task.id===id)??null;}
 async create(input:CreateTaskInput):Promise<TaskRecord>{
  const now=new Date(); const task:TaskRecord={id:`task-${++this.sequence}`,title:input.title,description:input.description??null,status:"NEW",priority:input.priority??"NORMAL",dueAt:input.dueAt??null,origin:input.origin??null,isDemo:false,createdAt:now,updatedAt:now};
  this.tasks.push(task);return task;
 }
 async update(id:string,input:UpdateTaskInput):Promise<TaskRecord|null>{
  const index=this.tasks.findIndex(task=>task.id===id);if(index<0)return null;
  const updated={...this.tasks[index],...input,updatedAt:new Date()};this.tasks[index]=updated;return updated;
 }
 async delete(id:string):Promise<boolean>{const count=this.tasks.length;this.tasks=this.tasks.filter(task=>task.id!==id);return this.tasks.length<count;}
}
describe("task endpoints",()=>{
 const repository=new InMemoryTaskRepository();const app=createApp({taskRepository:repository});
 it("creates a task with safe defaults",async()=>{
  const response=await request(app).post("/api/v1/tasks").send({title:"  Preparar relatório  "});
  expect(response.status).toBe(201);expect(response.body.data).toMatchObject({title:"Preparar relatório",status:"NEW",priority:"NORMAL",isDemo:false});
  const activities=await request(app).get(`/api/v1/tasks/${response.body.data.id}/activities`);
  expect(activities.status).toBe(200);expect(activities.body.data).toHaveLength(1);expect(activities.body.data[0]).toMatchObject({type:"CREATED"});
 });
 it("rejects invalid task data",async()=>{const response=await request(app).post("/api/v1/tasks").send({title:"   ",unexpected:true});expect(response.status).toBe(400);});
 it("lists tasks and supports filters",async()=>{const response=await request(app).get("/api/v1/tasks?status=NEW");expect(response.status).toBe(200);expect(response.body.data).toHaveLength(1);});
 it("updates a task status",async()=>{const response=await request(app).patch("/api/v1/tasks/task-1").send({status:"IN_PROGRESS"});expect(response.status).toBe(200);expect(response.body.data.status).toBe("IN_PROGRESS");});
 it("returns 404 for an unknown task",async()=>{const response=await request(app).get("/api/v1/tasks/missing");expect(response.status).toBe(404);});
 it("deletes a task explicitly",async()=>{const response=await request(app).delete("/api/v1/tasks/task-1");expect(response.status).toBe(204);expect(await repository.findById("task-1")).toBeNull();});
});