<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

type TaskStatus = "NEW" | "IN_PROGRESS" | "WAITING" | "COMPLETED";
type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  origin: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueAt?: string | null;
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const tasks = ref<Task[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const statusFilter = ref<"ALL" | TaskStatus>("ALL");
const form = ref({ title: "", description: "", priority: "NORMAL" as TaskPriority, dueAt: "" });

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

const visibleTasks = computed(() =>
  statusFilter.value === "ALL"
    ? tasks.value
    : tasks.value.filter((task) => task.status === statusFilter.value),
);
const activeCount = computed(() => tasks.value.filter((task) => task.status === "IN_PROGRESS").length);
const waitingCount = computed(() => tasks.value.filter((task) => task.status === "WAITING").length);
const completedCount = computed(() => tasks.value.filter((task) => task.status === "COMPLETED").length);

function taskUrl(path = "/tasks") {
  return `${apiBase}/api/v1${path}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function loadTasks() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await request<{ data: Task[] }>(taskUrl());
    tasks.value = result.data;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Falha ao carregar tarefas.";
  } finally {
    loading.value = false;
  }
}

async function createTask() {
  if (!form.value.title.trim()) return;
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  const payload: TaskPayload = {
    title: form.value.title.trim(),
    description: form.value.description.trim() || undefined,
    priority: form.value.priority,
    dueAt: form.value.dueAt ? new Date(`${form.value.dueAt}T12:00:00`).toISOString() : undefined,
  };
  try {
    const result = await request<{ data: Task }>(taskUrl(), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    tasks.value = [result.data, ...tasks.value];
    form.value = { title: "", description: "", priority: "NORMAL", dueAt: "" };
    successMessage.value = "Tarefa criada com sucesso.";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível criar a tarefa.";
  } finally {
    saving.value = false;
  }
}

async function updateStatus(task: Task, status: TaskStatus) {
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const result = await request<{ data: Task }>(taskUrl(`/tasks/${encodeURIComponent(task.id)}`), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    tasks.value = tasks.value.map((item) => item.id === task.id ? result.data : item);
    successMessage.value = "Status atualizado.";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível atualizar o status.";
    await loadTasks();
  }
}

function formatDueDate(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function shortId(id: string) {
  return id.length > 10 ? id.slice(-8).toUpperCase() : id.toUpperCase();
}

onMounted(loadTasks);
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar" aria-label="Navegação principal">
      <a class="brand" href="/" aria-label="taskDesk início">
        <span class="brand-mark">t</span>
        <span>task<span class="brand-light">Desk</span></span>
      </a>
      <div class="workspace-label">ESPAÇO DE TRABALHO</div>
      <nav class="navigation">
        <a class="nav-item active" href="#overview"><span class="nav-icon" aria-hidden="true">▦</span>Visão geral</a>
        <a class="nav-item" href="#tasks"><span class="nav-icon" aria-hidden="true">✓</span>Minhas tarefas</a>
      </nav>
      <div class="sidebar-bottom"><span class="status-dot status-online"></span>API conectada quando disponível</div>
    </aside>

    <section class="main-panel" id="overview">
      <header class="topbar">
        <div class="breadcrumb">Workspace <span>/</span> Visão geral</div>
        <div class="profile-chip" aria-label="Perfil local"><span class="avatar">TD</span><span>Meu espaço</span></div>
      </header>

      <div class="content">
        <div class="page-heading">
          <div>
            <p class="eyebrow">ORGANIZE O QUE PRECISA DA SUA ATENÇÃO</p>
            <h1>Visão geral</h1>
            <p class="subtitle">Suas tarefas em um só lugar, sem transformar todo e-mail em pendência.</p>
          </div>
          <span class="demo-badge live-badge"><span></span> Dados da API</span>
        </div>

        <div v-if="errorMessage" class="feedback feedback-error" role="alert">
          {{ errorMessage }}
          <button class="text-button" type="button" @click="loadTasks">Tentar novamente</button>
        </div>
        <div v-if="successMessage" class="feedback feedback-success" role="status">{{ successMessage }}</div>

        <section class="summary-grid" aria-label="Resumo de tarefas">
          <article class="summary-card"><span class="summary-label">Total de tarefas</span><strong>{{ String(tasks.length).padStart(2, "0") }}</strong><span class="summary-foot">Registros salvos na API</span></article>
          <article class="summary-card"><span class="summary-label">Em andamento</span><strong>{{ String(activeCount).padStart(2, "0") }}</strong><span class="summary-foot">Trabalho ativo</span></article>
          <article class="summary-card"><span class="summary-label">Aguardando retorno</span><strong>{{ String(waitingCount).padStart(2, "0") }}</strong><span class="summary-foot">Dependem de terceiros</span></article>
          <article class="summary-card"><span class="summary-label">Concluídas</span><strong>{{ String(completedCount).padStart(2, "0") }}</strong><span class="summary-foot">Finalizadas</span></article>
        </section>

        <section class="tasks-section" id="tasks">
          <div class="section-heading">
            <div><h2>Suas tarefas</h2><p>Crie e acompanhe suas próximas ações.</p></div>
            <span class="task-count">{{ tasks.length }} registro(s)</span>
          </div>

          <form class="task-form" @submit.prevent="createTask">
            <div class="form-heading"><strong>Nova tarefa</strong><span>Os campos com * são obrigatórios.</span></div>
            <label class="field-label" for="task-title">Título *</label>
            <input id="task-title" v-model="form.title" maxlength="160" required placeholder="Ex.: Revisar documentação do projeto" />
            <label class="field-label" for="task-description">Descrição</label>
            <textarea id="task-description" v-model="form.description" maxlength="5000" rows="2" placeholder="Adicione contexto ou próximos passos (opcional)." />
            <div class="form-row">
              <div class="form-field"><label class="field-label" for="task-priority">Prioridade</label><select id="task-priority" v-model="form.priority"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></div>
              <div class="form-field"><label class="field-label" for="task-due">Prazo</label><input id="task-due" v-model="form.dueAt" type="date" /></div>
              <button class="primary-button" type="submit" :disabled="saving || !form.title.trim()">{{ saving ? "Salvando..." : "＋ Criar tarefa" }}</button>
            </div>
          </form>

          <div class="task-toolbar">
            <label class="field-label" for="status-filter">Filtrar por status</label>
            <select id="status-filter" v-model="statusFilter" class="filter-select">
              <option value="ALL">Todas</option><option value="NEW">Novas</option><option value="IN_PROGRESS">Em andamento</option><option value="WAITING">Aguardando retorno</option><option value="COMPLETED">Concluídas</option>
            </select>
          </div>

          <div v-if="loading" class="empty-state" role="status">Carregando tarefas...</div>
          <div v-else-if="visibleTasks.length === 0" class="empty-state">
            <strong>{{ tasks.length === 0 ? "Seu espaço ainda está vazio." : "Nenhuma tarefa neste filtro." }}</strong>
            <p>{{ tasks.length === 0 ? "Crie sua primeira tarefa no formulário acima." : "Escolha outro status para ver suas tarefas." }}</p>
          </div>
          <div v-else class="task-list">
            <article v-for="task in visibleTasks" :key="task.id" class="task-card">
              <div class="task-main">
                <div class="task-title-row">
                  <h3>{{ task.title }}</h3>
                  <span class="priority" :class="`priority-${task.priority.toLowerCase()}`">{{ priorityLabels[task.priority] }}</span>
                </div>
                <p v-if="task.description">{{ task.description }}</p>
                <div class="task-meta"><span class="task-id">{{ shortId(task.id) }}</span><span class="meta-separator">·</span><span>Prazo: {{ formatDueDate(task.dueAt) }}</span></div>
              </div>
              <label class="status-control"><span class="sr-only">Status de {{ task.title }}</span>
                <select :value="task.status" class="task-status-select" @change="updateStatus(task, ($event.target as HTMLSelectElement).value as TaskStatus)">
                  <option value="NEW">{{ statusLabels.NEW }}</option><option value="IN_PROGRESS">{{ statusLabels.IN_PROGRESS }}</option><option value="WAITING">{{ statusLabels.WAITING }}</option><option value="COMPLETED">{{ statusLabels.COMPLETED }}</option>
                </select>
              </label>
            </article>
          </div>
        </section>

        <div class="next-step-note">
          <span class="note-icon" aria-hidden="true">✦</span>
          <div><strong>Seu espaço está conectado à API.</strong><p>As tarefas são persistidas no banco configurado no backend. Nenhuma caixa de e-mail está conectada nesta etapa.</p></div>
        </div>
      </div>
    </section>
  </main>
</template>
