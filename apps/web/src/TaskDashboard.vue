<script setup lang="ts">
import { accessToken } from "./auth";
import { computed, onMounted, ref, watch } from "vue";

type TaskStatus = "NEW" | "IN_PROGRESS" | "WAITING" | "COMPLETED";
type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface TaskActivity { id: string; taskId: string; type: string; message: string; createdAt: string; }

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
interface TaskSummary { total:number; inProgress:number; waiting:number; completed:number; overdue:number; dueSoon:number; }
interface TaskPage { data:Task[]; pagination:{page:number;limit:number;total:number;totalPages:number}; }
const summary = ref<TaskSummary | null>(null);
const page = ref(1);
const pageSize = 25;
const filteredTotal = ref(0);
const loadingMore = ref(false);
let loadGeneration = 0;
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const taskLoadFailed = ref(false);
const retryLoadAvailable = ref(false);
const apiConnected = ref<boolean | null>(null);
const activeSection = ref<"overview" | "tasks">("overview");
const activityLoadingTaskId = ref<string | null>(null);
const activityErrors = ref<Record<string, string>>({});
const statusFilter = ref<"ALL" | TaskStatus>("ALL");
const priorityFilter = ref<"ALL" | TaskPriority>("ALL");
const form = ref({ title: "", description: "", priority: "NORMAL" as TaskPriority, dueAt: "" });
const editingTaskId = ref<string | null>(null);
const expandedTaskId = ref<string | null>(null);
const activities = ref<Record<string, TaskActivity[]>>({});
const editForm = ref({ title: "", description: "", priority: "NORMAL" as TaskPriority, dueAt: "" });

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

const visibleTasks = computed(() => tasks.value);

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function dueState(task: Task): "overdue" | "soon" | null {
  if (!task.dueAt || task.status === "COMPLETED") return null;
  const dueDate = task.dueAt.slice(0, 10);
  const today = new Date();
  if (dueDate < localDateKey(today)) return "overdue";
  const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  return dueDate <= localDateKey(nextWeek) ? "soon" : null;
}

function dueStateLabel(task: Task) {
  const state = dueState(task);
  return state === "overdue" ? "Atrasada" : state === "soon" ? "Prazo próximo" : "";
}

const overdueCount = computed(() => summary.value?.overdue ?? 0);
const dueSoonCount = computed(() => summary.value?.dueSoon ?? 0);
const activeCount = computed(() => summary.value?.inProgress ?? 0);
const waitingCount = computed(() => summary.value?.waiting ?? 0);
const completedCount = computed(() => summary.value?.completed ?? 0);

function taskUrl(path = "/tasks") {
  return `${apiBase}/api/v1${path}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await accessToken();
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (response.status === 401) window.dispatchEvent(new Event("taskdesk:unauthorized"));
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function loadTasks() {
  const generation = ++loadGeneration;
  loading.value = true;
  errorMessage.value = "";
  retryLoadAvailable.value = false;
  page.value = 1;
  tasks.value = [];
  summary.value = null;
  try {
    const query = new URLSearchParams({ page: "1", limit: String(pageSize) });
    if (statusFilter.value !== "ALL") query.set("status", statusFilter.value);
    if (priorityFilter.value !== "ALL") query.set("priority", priorityFilter.value);
    const [result, overview] = await Promise.all([
      request<TaskPage>(taskUrl() + "?" + query.toString()),
      request<{data:TaskSummary}>(taskUrl("/tasks/summary")),
    ]);
    if (generation !== loadGeneration) return;
    tasks.value = result.data;
    filteredTotal.value = result.pagination.total;
    summary.value = overview.data;
    taskLoadFailed.value = false;
    apiConnected.value = true;
  } catch (error) {
    if (generation !== loadGeneration) return;
    errorMessage.value = error instanceof Error ? error.message : "Falha ao carregar tarefas.";
    taskLoadFailed.value = true;
    apiConnected.value = false;
    retryLoadAvailable.value = true;
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function loadMoreTasks() {
  if (loading.value || loadingMore.value || tasks.value.length >= filteredTotal.value) return;
  const generation = loadGeneration;
  loadingMore.value = true;
  errorMessage.value = "";
  try {
    const nextPage = page.value + 1;
    const query = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
    if (statusFilter.value !== "ALL") query.set("status", statusFilter.value);
    if (priorityFilter.value !== "ALL") query.set("priority", priorityFilter.value);
    const result = await request<TaskPage>(taskUrl() + "?" + query.toString());
    if (generation !== loadGeneration) return;
    const seen = new Set(tasks.value.map(task => task.id));
    tasks.value = [...tasks.value, ...result.data.filter(task => !seen.has(task.id))];
    page.value = nextPage;
    filteredTotal.value = result.pagination.total;
  } catch (error) {
    if (generation === loadGeneration) errorMessage.value = error instanceof Error ? error.message : "Falha ao carregar mais tarefas.";
  } finally {
    loadingMore.value = false;
  }
}

watch([statusFilter, priorityFilter], () => { void loadTasks(); });

async function createTask() {
  if (!form.value.title.trim()) return;
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  retryLoadAvailable.value = false;
  const payload: TaskPayload = {
    title: form.value.title.trim(),
    description: form.value.description.trim() || undefined,
    priority: form.value.priority,
    dueAt: form.value.dueAt ? new Date(`${form.value.dueAt}T12:00:00`).toISOString() : undefined,
  };
  try {
    await request<{ data: Task }>(taskUrl(), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadTasks();
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
  retryLoadAvailable.value = false;
  try {
    await request<{ data: Task }>(taskUrl(`/tasks/${encodeURIComponent(task.id)}`), {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadTasks();
    delete activities.value[task.id];
    if (expandedTaskId.value === task.id) expandedTaskId.value = null;
    successMessage.value = "Status atualizado.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o status.";
    await loadTasks();
    errorMessage.value = message;
    retryLoadAvailable.value = false;
  }
}

async function loadActivities(task: Task) {
  if (activities.value[task.id] || activityLoadingTaskId.value === task.id) return;
  activityLoadingTaskId.value = task.id;
  const nextErrors = { ...activityErrors.value };
  delete nextErrors[task.id];
  activityErrors.value = nextErrors;
  try {
    const result = await request<{ data: TaskActivity[] }>(taskUrl(`/tasks/${encodeURIComponent(task.id)}/activities`));
    activities.value = { ...activities.value, [task.id]: result.data };
  } catch (error) {
    activityErrors.value = {
      ...activityErrors.value,
      [task.id]: error instanceof Error ? error.message : "Não foi possível carregar o histórico.",
    };
  } finally {
    activityLoadingTaskId.value = null;
  }
}

async function toggleActivities(task: Task) {
  if (expandedTaskId.value === task.id) {
    expandedTaskId.value = null;
    return;
  }
  expandedTaskId.value = task.id;
  await loadActivities(task);
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function activityTypeLabel(type: string) {
  if (type === "CREATED") return "Criada";
  if (type === "UPDATED") return "Atualizada";
  if (type === "FIELD_UPDATED") return "Alteração";
  return type;
}

function startEditing(task: Task) {
  editingTaskId.value = task.id;
  editForm.value = {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
  };
}

function cancelEditing() {
  editingTaskId.value = null;
}

async function saveTask(task: Task) {
  if (!editForm.value.title.trim()) return;
  saving.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  retryLoadAvailable.value = false;
  try {
    const payload = {
      title: editForm.value.title.trim(),
      description: editForm.value.description.trim() || null,
      priority: editForm.value.priority,
      dueAt: editForm.value.dueAt
        ? new Date(`${editForm.value.dueAt}T12:00:00`).toISOString()
        : null,
    };
    await request<{ data: Task }>(taskUrl(`/tasks/${encodeURIComponent(task.id)}`), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await loadTasks();
    delete activities.value[task.id];
    if (expandedTaskId.value === task.id) expandedTaskId.value = null;
    editingTaskId.value = null;
    successMessage.value = "Tarefa atualizada.";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível salvar a tarefa.";
  } finally {
    saving.value = false;
  }
}

async function deleteTask(task: Task) {
  const confirmed = window.confirm(`Deseja excluir a tarefa "${task.title}"? Essa ação não pode ser desfeita.`);
  if (!confirmed) return;
  errorMessage.value = "";
  successMessage.value = "";
  retryLoadAvailable.value = false;
  try {
    await request<void>(taskUrl(`/tasks/${encodeURIComponent(task.id)}`), { method: "DELETE" });
    await loadTasks();
    const nextActivities = { ...activities.value };
    delete nextActivities[task.id];
    activities.value = nextActivities;
    if (expandedTaskId.value === task.id) expandedTaskId.value = null;
    successMessage.value = "Tarefa excluída.";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Não foi possível excluir a tarefa.";
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
        <a class="nav-item" :class="{ active: activeSection === 'overview' }" href="#overview" :aria-current="activeSection === 'overview' ? 'location' : undefined" @click="activeSection = 'overview'"><span class="nav-icon" aria-hidden="true">▦</span>Visão geral</a>
        <a class="nav-item" :class="{ active: activeSection === 'tasks' }" href="#tasks" :aria-current="activeSection === 'tasks' ? 'location' : undefined" @click="activeSection = 'tasks'"><span class="nav-icon" aria-hidden="true">✓</span>Minhas tarefas</a>
      </nav>
      <div class="sidebar-bottom"><span class="status-dot" :class="apiConnected === false ? 'status-offline' : apiConnected === true ? 'status-online' : 'status-checking'"></span>{{ apiConnected === false ? "API indisponível" : apiConnected === true ? "API conectada" : "Verificando conexão" }}</div>
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
          <span class="demo-badge" :class="apiConnected === false ? 'offline-badge' : apiConnected === true ? 'live-badge' : 'checking-badge'" role="status"><span></span>{{ apiConnected === false ? "API indisponível" : apiConnected === true ? "Dados da API" : "Verificando API" }}</span>
        </div>

        <div v-if="errorMessage" class="feedback feedback-error" role="alert">
          {{ errorMessage }}
          <button v-if="retryLoadAvailable" class="text-button" type="button" @click="loadTasks">Tentar novamente</button>
        </div>
        <div v-if="successMessage" class="feedback feedback-success" role="status">{{ successMessage }}</div>

        <section class="summary-grid" aria-label="Resumo de tarefas">
          <article class="summary-card"><span class="summary-label">Total de tarefas</span><strong>{{ apiConnected === false ? "—" : String(summary?.total ?? 0).padStart(2, "0") }}</strong><span class="summary-foot">Registros salvos na API</span></article>
          <article class="summary-card"><span class="summary-label">Em andamento</span><strong>{{ apiConnected === false ? "—" : String(activeCount).padStart(2, "0") }}</strong><span class="summary-foot">Trabalho ativo</span></article>
          <article class="summary-card"><span class="summary-label">Aguardando retorno</span><strong>{{ apiConnected === false ? "—" : String(waitingCount).padStart(2, "0") }}</strong><span class="summary-foot">Dependem de terceiros</span></article>
          <article class="summary-card"><span class="summary-label">Concluídas</span><strong>{{ apiConnected === false ? "—" : String(completedCount).padStart(2, "0") }}</strong><span class="summary-foot">Finalizadas</span></article>
          <article class="summary-card"><span class="summary-label">Atrasadas</span><strong>{{ apiConnected === false ? "—" : String(overdueCount).padStart(2, "0") }}</strong><span class="summary-foot">Prazo já passou</span></article>
          <article class="summary-card"><span class="summary-label">Prazo próximo</span><strong>{{ apiConnected === false ? "—" : String(dueSoonCount).padStart(2, "0") }}</strong><span class="summary-foot">Próximos 7 dias</span></article>
        </section>

        <section class="tasks-section" id="tasks">
          <div class="section-heading">
            <div><h2>Suas tarefas</h2><p>Crie e acompanhe suas próximas ações.</p></div>
            <span class="task-count">{{ apiConnected === false ? "Dados indisponíveis" : `${visibleTasks.length} de ${filteredTotal} tarefa(s) no filtro` }}</span>
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
            <div class="filter-field"><label class="field-label" for="status-filter">Status</label>
              <select id="status-filter" v-model="statusFilter" class="filter-select">
                <option value="ALL">Todos os status</option><option value="NEW">Novas</option><option value="IN_PROGRESS">Em andamento</option><option value="WAITING">Aguardando retorno</option><option value="COMPLETED">Concluídas</option>
              </select>
            </div>
            <div class="filter-field"><label class="field-label" for="priority-filter">Prioridade</label>
              <select id="priority-filter" v-model="priorityFilter" class="filter-select">
                <option value="ALL">Todas as prioridades</option><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div v-if="loading" class="empty-state" role="status">Carregando tarefas...</div>
          <div v-else-if="visibleTasks.length === 0 && !taskLoadFailed" class="empty-state">
            <strong>{{ filteredTotal === 0 && statusFilter === "ALL" && priorityFilter === "ALL" ? "Seu espaço ainda está vazio." : "Nenhuma tarefa neste filtro." }}</strong>
            <p>{{ filteredTotal === 0 && statusFilter === "ALL" && priorityFilter === "ALL" ? "Crie sua primeira tarefa no formulário acima." : "Ajuste os filtros de status ou prioridade para ver outras tarefas." }}</p>
          </div>
          <div v-else-if="!taskLoadFailed" class="task-list">
            <article v-for="task in visibleTasks" :key="task.id" class="task-card">
              <form v-if="editingTaskId === task.id" class="edit-form" @submit.prevent="saveTask(task)">
                <label class="field-label" :for="`edit-title-${task.id}`">Título *</label>
                <input :id="`edit-title-${task.id}`" v-model="editForm.title" maxlength="160" required />
                <label class="field-label" :for="`edit-description-${task.id}`">Descrição</label>
                <textarea :id="`edit-description-${task.id}`" v-model="editForm.description" rows="2" maxlength="5000" />
                <div class="form-row">
                  <div class="form-field"><label class="field-label" :for="`edit-priority-${task.id}`">Prioridade</label><select :id="`edit-priority-${task.id}`" v-model="editForm.priority"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></div>
                  <div class="form-field"><label class="field-label" :for="`edit-due-${task.id}`">Prazo</label><input :id="`edit-due-${task.id}`" v-model="editForm.dueAt" type="date" /></div>
                  <div class="edit-actions"><button class="primary-button" type="submit" :disabled="saving || !editForm.title.trim()">{{ saving ? "Salvando..." : "Salvar" }}</button><button class="secondary-button" type="button" @click="cancelEditing">Cancelar</button></div>
                </div>
              </form>
              <template v-else>
                <div class="task-main">
                  <div class="task-title-row">
                    <h3>{{ task.title }}</h3>
                    <span class="priority" :class="`priority-${task.priority.toLowerCase()}`">{{ priorityLabels[task.priority] }}</span>
                    <span v-if="task.isDemo" class="demo-task-badge">Demonstração</span>
                  </div>
                  <p v-if="task.description">{{ task.description }}</p>
                  <div class="task-meta"><span class="task-id">{{ shortId(task.id) }}</span><span class="meta-separator">·</span><span>Prazo: {{ formatDueDate(task.dueAt) }}</span><span v-if="dueState(task)" class="due-indicator" :class="'due-' + dueState(task)">{{ dueStateLabel(task) }}</span></div>
                </div>
                <div class="task-actions">
                  <label class="status-control"><span class="sr-only">Status de {{ task.title }}</span>
                    <select :value="task.status" class="task-status-select" @change="updateStatus(task, ($event.target as HTMLSelectElement).value as TaskStatus)">
                      <option value="NEW">{{ statusLabels.NEW }}</option><option value="IN_PROGRESS">{{ statusLabels.IN_PROGRESS }}</option><option value="WAITING">{{ statusLabels.WAITING }}</option><option value="COMPLETED">{{ statusLabels.COMPLETED }}</option>
                    </select>
                  </label>
                  <button class="secondary-button" type="button" @click="startEditing(task)">Editar</button>
                  <button class="secondary-button" type="button" @click="toggleActivities(task)">{{ expandedTaskId === task.id ? "Ocultar histórico" : "Histórico" }}</button>
                  <button class="danger-button" type="button" @click="deleteTask(task)">Excluir</button>
                </div>
              </template>
              <div v-if="expandedTaskId === task.id" class="activity-panel" aria-live="polite">
                <strong>Histórico</strong>
                <p v-if="activityLoadingTaskId === task.id" class="activity-empty">Carregando histórico...</p>
                <div v-else-if="activityErrors[task.id]" class="activity-error" role="alert">
                  <span>{{ activityErrors[task.id] }}</span>
                  <button class="text-button" type="button" @click="loadActivities(task)">Tentar novamente</button>
                </div>
                <div v-else-if="activities[task.id]?.length" class="activity-list">
                  <div v-for="activity in activities[task.id]" :key="activity.id" class="activity-item">
                    <span class="activity-dot" aria-hidden="true"></span>
                    <div><span class="activity-type">{{ activityTypeLabel(activity.type) }}</span><span>{{ activity.message }}</span><time :datetime="activity.createdAt">{{ formatActivityDate(activity.createdAt) }}</time></div>
                  </div>
                </div>
                <p v-else-if="activities[task.id]" class="activity-empty">Nenhuma atividade registrada.</p>
              </div>
            </article>
          </div>
          <div v-else class="empty-state" role="status">
            <strong>Não foi possível carregar as tarefas.</strong>
            <p>Os dados anteriores não serão apresentados como se fossem atuais. Tente carregar novamente.</p>
          </div>
          <div v-if="!loading && !taskLoadFailed && tasks.length < filteredTotal" class="task-pagination">
            <button class="secondary-button" type="button" :disabled="loadingMore" @click="loadMoreTasks">{{ loadingMore ? "Carregando..." : "Carregar mais tarefas" }}</button>
          </div>
        </section>

        <div class="next-step-note" :class="{ 'connection-note-error': apiConnected === false }" role="status">
          <span class="note-icon" aria-hidden="true">{{ apiConnected === false ? "!" : "✦" }}</span>
          <div><strong>{{ apiConnected === false ? "A API não está disponível agora." : apiConnected === true ? "Seu espaço está conectado à API." : "Verificando conexão com a API." }}</strong><p>{{ apiConnected === false ? "Os dados não foram carregados. Verifique a conexão e tente novamente." : "As tarefas são persistidas no banco configurado no backend. Nenhuma caixa de e-mail está conectada nesta etapa." }}</p></div>
        </div>
      </div>
    </section>
  </main>
</template>
