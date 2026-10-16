import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { tasksCollection } from "@/data/tasks";
import { buildTask, resizeTask } from "@/domain/task-ops";
import { DEFAULT_PREFS } from "@/prefs/schema";
import { usePrefsStore } from "@/prefs/store";
import { useUiStore } from "@/stores/ui";
import { TaskEditor } from "./task-editor";

const original = buildTask({ title: "Review outline", priority: "medium", durationMin: 60, placement: { date: "2026-10-16", startMin: 840 } }, "outline", "2026-10-16T00:00:00Z");
beforeEach(() => {
  tasksCollection.write([original]);
  usePrefsStore.setState({ prefs: DEFAULT_PREFS, hydrated: true });
  useUiStore.getState().openEditor({ kind: "edit", id: original.id });
});
describe("task timing editor", () => {
  it("previews duration without persisting it and discards the preview on Cancel", async () => {
    render(<TaskEditor />);
    fireEvent.change(await screen.findByLabelText("Estimated length"), { target: { value: "90" } });
    await waitFor(() => expect(useUiStore.getState().editorTiming?.durationMin).toBe(90));
    expect(screen.getByLabelText("End time")).toHaveValue("15:30");
    expect(tasksCollection.getSnapshot()[0].durationMin).toBe(60);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(useUiStore.getState().editorTiming).toBeNull();
    expect(tasksCollection.getSnapshot()[0].durationMin).toBe(60);
  });
  it("saves the duration derived from end time and uses the selected adjustment step", async () => {
    render(<TaskEditor />);
    fireEvent.change(await screen.findByLabelText("Time increments"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Extend by 10 minutes" }));
    expect(screen.getByLabelText("Estimated length")).toHaveValue(70);
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "16:00" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(tasksCollection.getSnapshot()[0].durationMin).toBe(120);
    expect(tasksCollection.getSnapshot()[0].placement?.startMin).toBe(840);
    expect(useUiStore.getState().editorTiming).toBeNull();
  });
  it("opens with the latest calendar resize and keeps start, end and duration consistent", async () => {
    tasksCollection.write(resizeTask([original], original.id, 180));
    render(<TaskEditor />);
    expect(await screen.findByLabelText("Estimated length")).toHaveValue(180);
    expect(screen.getByLabelText("End time")).toHaveValue("17:00");
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "15:00" } });
    await waitFor(() => expect(useUiStore.getState().editorTiming?.placement?.startMin).toBe(900));
    expect(screen.getByLabelText("End time")).toHaveValue("18:00");
    act(() => useUiStore.getState().closeEditor());
  });
});
