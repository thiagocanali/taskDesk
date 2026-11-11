import type { TaskRecord, TaskStatus, TaskPriority } from "./task.types.js";

const statusLabels: Record<TaskStatus, string> = {
  NEW: "Nova",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando retorno",
  COMPLETED: "Concluída",
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function activityMessage(field: keyof TaskRecord, before: TaskRecord, after: TaskRecord): string | null {
  const previous = before[field];
  const next = after[field];
  if (previous instanceof Date || next instanceof Date) {
    const previousTime = previous instanceof Date ? previous.getTime() : previous;
    const nextTime = next instanceof Date ? next.getTime() : next;
    if (previousTime === nextTime) return null;
  } else if (previous === next) {
    return null;
  }

  if (field === "status") {
    return `Status: ${statusLabels[before.status]} → ${statusLabels[after.status]}`;
  }
  if (field === "priority") {
    return `Prioridade: ${priorityLabels[before.priority]} → ${priorityLabels[after.priority]}`;
  }
  if (field === "title") {
    return `Título alterado: “${before.title}” → “${after.title}”`;
  }
  if (field === "dueAt") {
    const formatDate = (value: Date | null) => value ? value.toISOString().slice(0, 10) : "Sem prazo";
    return `Prazo: ${formatDate(before.dueAt)} → ${formatDate(after.dueAt)}`;
  }
  if (field === "description") return "Descrição atualizada.";
  if (field === "origin") return "Origem atualizada.";
  return null;
}
