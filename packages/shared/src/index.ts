export type TaskStatus = "NEW" | "IN_PROGRESS" | "WAITING" | "COMPLETED";

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  isDemo: boolean;
}
