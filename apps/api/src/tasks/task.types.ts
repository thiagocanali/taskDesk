export const TASK_STATUSES = ["NEW", "IN_PROGRESS", "WAITING", "COMPLETED"] as const;
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export interface TaskActivityRecord { id:string; taskId:string; type:string; message:string; createdAt:Date; }
export interface TaskRecord {
 id:string; title:string; description:string|null; status:TaskStatus; priority:TaskPriority;
 dueAt:Date|null; origin:string|null; isDemo:boolean; createdAt:Date; updatedAt:Date;
}
export interface CreateTaskInput { title:string; description?:string; priority?:TaskPriority; dueAt?:Date|null; origin?:string; }
export interface UpdateTaskInput { title?:string; description?:string|null; status?:TaskStatus; priority?:TaskPriority; dueAt?:Date|null; origin?:string|null; }
export interface ListTaskFilters { status?:TaskStatus; priority?:TaskPriority; }
export interface TaskRepository {
 list(filters:ListTaskFilters):Promise<TaskRecord[]>;
 findById(id:string):Promise<TaskRecord|null>;
 listActivities(taskId:string):Promise<TaskActivityRecord[]>;
 addActivity(taskId:string,type:string,message:string):Promise<TaskActivityRecord>;
 create(input:CreateTaskInput):Promise<TaskRecord>;
 update(id:string,input:UpdateTaskInput):Promise<TaskRecord|null>;
 delete(id:string):Promise<boolean>;
}