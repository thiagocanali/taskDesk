<script setup lang="ts">
import { computed } from "vue";

type TaskStatus = "new" | "in-progress" | "waiting" | "completed";

interface DemoTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "high" | "normal" | "low";
  dueLabel: string;
}

const todayLabel = computed(() =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date()).toLocaleUpperCase("pt-BR"),
);

const demoTasks: DemoTask[] = [
  {
    id: "TD-001",
    title: "Revisar documentação do projeto",
    description: "Conferir escopo, arquitetura e próximos marcos.",
    status: "in-progress",
    priority: "high",
    dueLabel: "Hoje",
  },
  {
    id: "TD-002",
    title: "Organizar pendências da semana",
    description: "Reunir compromissos e definir prioridades.",
    status: "new",
    priority: "normal",
    dueLabel: "Amanhã",
  },
  {
    id: "TD-003",
    title: "Aguardar retorno sobre uma solicitação",
    description: "Retomar o acompanhamento quando houver resposta.",
    status: "waiting",
    priority: "low",
    dueLabel: "Sem prazo",
  },
];

const statusLabels: Record<TaskStatus, string> = {
  new: "Nova",
  "in-progress": "Em andamento",
  waiting: "Aguardando retorno",
  completed: "Concluída",
};

const priorityLabels = {
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
} as const;
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
        <a class="nav-item active" href="#overview" aria-current="page">
          <span class="nav-icon" aria-hidden="true">▦</span>
          Visão geral
        </a>
        <a class="nav-item" href="#tasks">
          <span class="nav-icon" aria-hidden="true">✓</span>
          Minhas tarefas
        </a>
      </nav>

      <div class="sidebar-bottom">
        <span class="status-dot"></span>
        Ambiente de demonstração
      </div>
    </aside>

    <section class="main-panel" id="overview">
      <header class="topbar">
        <div class="breadcrumb">Workspace <span>/</span> Visão geral</div>
        <div class="profile-chip" aria-label="Perfil de demonstração">
          <span class="avatar">TD</span>
          <span>Meu espaço</span>
        </div>
      </header>

      <div class="content">
        <div class="page-heading">
          <div>
            <p class="eyebrow">{{ todayLabel }}</p>
            <h1>Visão geral</h1>
            <p class="subtitle">Acompanhe o que precisa da sua atenção.</p>
          </div>
          <span class="demo-badge"><span></span> Dados demonstrativos</span>
        </div>

        <section class="summary-grid" aria-label="Resumo de tarefas">
          <article class="summary-card">
            <span class="summary-label">Total de tarefas</span>
            <strong>03</strong>
            <span class="summary-foot">Neste espaço de demonstração</span>
          </article>
          <article class="summary-card">
            <span class="summary-label">Em andamento</span>
            <strong>01</strong>
            <span class="summary-foot">Trabalho ativo</span>
          </article>
          <article class="summary-card">
            <span class="summary-label">Aguardando retorno</span>
            <strong>01</strong>
            <span class="summary-foot">Dependem de terceiros</span>
          </article>
          <article class="summary-card">
            <span class="summary-label">Concluídas</span>
            <strong>00</strong>
            <span class="summary-foot">Finalizadas neste espaço</span>
          </article>
        </section>

        <section class="tasks-section" id="tasks">
          <div class="section-heading">
            <div>
              <h2>Suas tarefas</h2>
              <p>Uma visão simples das próximas ações.</p>
            </div>
            <span class="task-count">03 registros</span>
          </div>

          <div class="task-list">
            <article v-for="task in demoTasks" :key="task.id" class="task-card">
              <div class="task-main">
                <div class="task-title-row">
                  <h3>{{ task.title }}</h3>
                  <span class="priority" :class="`priority-${task.priority}`">
                    {{ priorityLabels[task.priority] }}
                  </span>
                </div>
                <p>{{ task.description }}</p>
                <div class="task-meta">
                  <span class="task-id">{{ task.id }}</span>
                  <span class="meta-separator">·</span>
                  <span>Prazo: {{ task.dueLabel }}</span>
                </div>
              </div>
              <span class="task-status" :class="`status-${task.status}`">
                {{ statusLabels[task.status] }}
              </span>
            </article>
          </div>
        </section>

        <div class="next-step-note">
          <span class="note-icon" aria-hidden="true">✦</span>
          <div>
            <strong>Estamos preparando seu espaço de trabalho.</strong>
            <p>A criação e edição de tarefas será habilitada na próxima etapa. Nenhuma caixa de e-mail está conectada.</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
