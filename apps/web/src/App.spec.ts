import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";

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

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-12345678",
    title: "Tarefa de teste",
    description: null,
    status: "NEW",
    priority: "NORMAL",
    dueAt: null,
    origin: null,
    isDemo: false,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

async function renderApp() {
  const wrapper = mount(App);
  await flushPromises();
  return wrapper;
}

describe("task dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T12:00:00.000Z"));
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not present unavailable task data as an empty workspace and retries loading", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("API indisponível"))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    const wrapper = await renderApp();

    expect(wrapper.text()).toContain("API indisponível");
    expect(wrapper.find(".empty-state").exists()).toBe(false);
    expect(wrapper.find(".offline-badge").exists()).toBe(true);

    await wrapper.find(".feedback-error .text-button").trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Seu espaço ainda está vazio.");
    expect(wrapper.find(".live-badge").exists()).toBe(true);
  });

  it("combines status and priority filters", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      data: [
        makeTask({ id: "task-1", title: "Alta em andamento", status: "IN_PROGRESS", priority: "HIGH" }),
        makeTask({ id: "task-2", title: "Normal em andamento", status: "IN_PROGRESS", priority: "NORMAL" }),
        makeTask({ id: "task-3", title: "Alta concluída", status: "COMPLETED", priority: "HIGH" }),
      ],
    }));

    const wrapper = await renderApp();

    await wrapper.find("#status-filter").setValue("IN_PROGRESS");
    await wrapper.find("#priority-filter").setValue("HIGH");

    expect(wrapper.findAll(".task-card")).toHaveLength(1);
    expect(wrapper.text()).toContain("Alta em andamento");
    expect(wrapper.text()).not.toContain("Normal em andamento");
    expect(wrapper.text()).not.toContain("Alta concluída");
  });

  it("clearly identifies tasks marked as demonstration data", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      data: [makeTask({ id: "task-demo", title: "Tarefa demonstrativa", isDemo: true })],
    }));

    const wrapper = await renderApp();

    expect(wrapper.find(".demo-task-badge").text()).toBe("Demonstração");
  });

  it("shows overdue and upcoming due dates but ignores completed tasks", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      data: [
        makeTask({ id: "task-overdue", title: "Prazo vencido", dueAt: "2026-11-07T12:00:00.000Z" }),
        makeTask({ id: "task-soon", title: "Prazo próximo", dueAt: "2026-11-12T12:00:00.000Z" }),
        makeTask({ id: "task-done", title: "Tarefa concluída", status: "COMPLETED", dueAt: "2026-11-07T12:00:00.000Z" }),
      ],
    }));

    const wrapper = await renderApp();
    const taskCards = wrapper.findAll(".task-card");

    expect(wrapper.findAll(".due-indicator")).toHaveLength(2);
    expect(wrapper.text()).toContain("Atrasada");
    expect(wrapper.text()).toContain("Prazo próximo");
    expect(taskCards[2]?.find(".due-indicator").exists()).toBe(false);
  });

  it("creates a task and displays the success feedback", async () => {
    const createdTask = makeTask({
      id: "task-created",
      title: "Revisar relatório",
      priority: "HIGH",
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: createdTask }));

    const wrapper = await renderApp();
    await wrapper.find("#task-title").setValue("  Revisar relatório  ");
    await wrapper.find("#task-priority").setValue("HIGH");
    await wrapper.find("form.task-form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/tasks", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"title":"Revisar relatório"'),
    }));
    expect(wrapper.text()).toContain("Revisar relatório");
    expect(wrapper.text()).toContain("Tarefa criada com sucesso.");
  });

  it("edits a task and sends normalized values", async () => {
    const original = makeTask({ id: "task-edit", title: "Título antigo" });
    const updated = makeTask({ id: "task-edit", title: "Título atualizado", priority: "URGENT" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [original] }))
      .mockResolvedValueOnce(jsonResponse({ data: updated }));

    const wrapper = await renderApp();
    await wrapper.find(".task-card .secondary-button").trigger("click");
    await wrapper.find("#edit-title-task-edit").setValue("  Título atualizado  ");
    await wrapper.find("#edit-priority-task-edit").setValue("URGENT");
    await wrapper.find("form.edit-form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/tasks/task-edit", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"title":"Título atualizado"'),
    }));
    expect(wrapper.text()).toContain("Título atualizado");
    expect(wrapper.text()).toContain("Tarefa atualizada.");
    expect(wrapper.find("form.edit-form").exists()).toBe(false);
  });

  it("keeps the status update error visible after refreshing the task list", async () => {
    const task = makeTask({ id: "task-status-error", status: "NEW" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [task] }))
      .mockResolvedValueOnce(jsonResponse({ error: "Falha ao atualizar status." }, 500))
      .mockResolvedValueOnce(jsonResponse({ data: [task] }));

    const wrapper = await renderApp();
    await wrapper.find(".task-status-select").setValue("IN_PROGRESS");
    await flushPromises();

    expect(wrapper.text()).toContain("Falha ao atualizar status.");
    expect(wrapper.find(".feedback-error .text-button").exists()).toBe(false);
  });

  it("does not present stale tasks as current when a failed update is followed by a failed refresh", async () => {
    const task = makeTask({ id: "task-stale", title: "Dados anteriores" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [task] }))
      .mockResolvedValueOnce(jsonResponse({ error: "Falha ao atualizar status." }, 500))
      .mockRejectedValueOnce(new Error("API indisponível"));

    const wrapper = await renderApp();
    expect(wrapper.findAll(".task-card")).toHaveLength(1);

    await wrapper.find(".task-status-select").setValue("IN_PROGRESS");
    await flushPromises();

    expect(wrapper.findAll(".task-card")).toHaveLength(0);
    expect(wrapper.text()).not.toContain("Dados anteriores");
    expect(wrapper.text()).toContain("Dados indisponíveis");
    expect(wrapper.text()).toContain("Não foi possível carregar as tarefas.");
    expect(wrapper.text()).toContain("API indisponível");
  });

  it("updates a task status and refreshes its visible state", async () => {
    const original = makeTask({ id: "task-status", status: "NEW" });
    const updated = makeTask({ id: "task-status", status: "IN_PROGRESS" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [original] }))
      .mockResolvedValueOnce(jsonResponse({ data: updated }));

    const wrapper = await renderApp();
    await wrapper.find(".task-status-select").setValue("IN_PROGRESS");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/tasks/task-status", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    }));
    expect(wrapper.text()).toContain("Status atualizado.");
  });

  it("loads task history and labels legacy update events", async () => {
    const task = makeTask({ id: "task-history" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [task] }))
      .mockResolvedValueOnce(jsonResponse({
        data: [
          { id: "activity-1", taskId: task.id, type: "CREATED", message: "Tarefa criada.", createdAt: "2026-11-08T10:00:00.000Z" },
          { id: "activity-2", taskId: task.id, type: "UPDATED", message: "Tarefa atualizada.", createdAt: "2026-11-08T11:00:00.000Z" },
          { id: "activity-3", taskId: task.id, type: "FIELD_UPDATED", message: "Prioridade: Normal → Alta", createdAt: "2026-11-08T12:00:00.000Z" },
        ],
      }));

    const wrapper = await renderApp();
    await wrapper.findAll("button").find((button) => button.text() === "Histórico")?.trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/tasks/task-history/activities", expect.anything());
    expect(wrapper.text()).toContain("Criada");
    expect(wrapper.text()).toContain("Atualizada");
    expect(wrapper.text()).toContain("Alteração");
    expect(wrapper.text()).toContain("Prioridade: Normal → Alta");
  });

  it("keeps history errors scoped to the task whose request failed", async () => {
    const first = makeTask({ id: "task-history-first", title: "Primeira tarefa" });
    const second = makeTask({ id: "task-history-second", title: "Segunda tarefa" });
    let rejectFirstHistory!: (reason: Error) => void;
    const firstHistory = new Promise<Response>((_resolve, reject) => {
      rejectFirstHistory = reject;
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [first, second] }))
      .mockImplementationOnce(() => firstHistory)
      .mockResolvedValueOnce(jsonResponse({
        data: [{ id: "activity-second", taskId: second.id, type: "CREATED", message: "Histórico da segunda tarefa.", createdAt: "2026-11-08T10:00:00.000Z" }],
      }));

    const wrapper = await renderApp();
    const cards = wrapper.findAll(".task-card");
    const firstHistoryButton = cards[0]!.findAll("button").find((button) => button.text() === "Histórico")!;
    const secondHistoryButton = cards[1]!.findAll("button").find((button) => button.text() === "Histórico")!;

    await firstHistoryButton.trigger("click");
    await secondHistoryButton.trigger("click");
    await flushPromises();
    rejectFirstHistory(new Error("Falha no histórico da primeira tarefa."));
    await flushPromises();

    const secondCard = wrapper.findAll(".task-card")[1]!;
    expect(secondCard.text()).toContain("Histórico da segunda tarefa.");
    expect(secondCard.find(".activity-error").exists()).toBe(false);
  });

  it("offers a retry when task history cannot be loaded", async () => {
    const task = makeTask({ id: "task-history-retry" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [task] }))
      .mockRejectedValueOnce(new Error("Histórico indisponível"))
      .mockResolvedValueOnce(jsonResponse({
        data: [{ id: "activity-retry", taskId: task.id, type: "CREATED", message: "Tarefa criada.", createdAt: "2026-11-08T10:00:00.000Z" }],
      }));

    const wrapper = await renderApp();
    await wrapper.findAll("button").find((button) => button.text() === "Histórico")?.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Histórico indisponível");
    expect(wrapper.text()).not.toContain("Nenhuma atividade registrada.");

    await wrapper.find(".activity-error .text-button").trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(wrapper.text()).toContain("Tarefa criada.");
  });

  it("does not delete a task when confirmation is cancelled", async () => {
    const task = makeTask({ id: "task-protected", title: "Manter tarefa" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [task] }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    const wrapper = await renderApp();
    await wrapper.find(".danger-button").trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("Manter tarefa");
    confirm.mockRestore();
  });

  it("deletes a task only after confirmation", async () => {
    const task = makeTask({ id: "task-delete", title: "Excluir tarefa" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [task] }))
      .mockResolvedValueOnce(jsonResponse(null, 204));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    const wrapper = await renderApp();
    await wrapper.find(".danger-button").trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/tasks/task-delete", expect.objectContaining({
      method: "DELETE",
    }));
    expect(wrapper.text()).not.toContain("Excluir tarefa");
    expect(wrapper.text()).toContain("Tarefa excluída.");
    confirm.mockRestore();
  });
});
