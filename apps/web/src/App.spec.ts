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
});
