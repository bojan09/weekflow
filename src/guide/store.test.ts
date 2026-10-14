import { beforeEach, describe, expect, it } from "vitest";
import { useGuideStore } from "./store";

beforeEach(() => {
  window.localStorage.clear();
  useGuideStore.setState({ done: {}, panelHidden: false, dismissedHints: {}, hydrated: true });
});

describe("guide store", () => {
  it("records completed steps and never un-ticks them", () => {
    useGuideStore.getState().complete(["add-task"]);
    useGuideStore.getState().complete(["lock-task", "add-task"]);
    expect(useGuideStore.getState().done).toEqual({ "add-task": true, "lock-task": true });
  });

  it("does not change state when nothing is new", () => {
    useGuideStore.getState().complete(["add-task"]);
    const before = useGuideStore.getState().done;
    useGuideStore.getState().complete(["add-task"]);
    expect(useGuideStore.getState().done).toBe(before);
  });

  it("hides, shows and dismisses hints", () => {
    useGuideStore.getState().hidePanel();
    expect(useGuideStore.getState().panelHidden).toBe(true);
    useGuideStore.getState().dismissHint("week");
    expect(useGuideStore.getState().dismissedHints).toEqual({ week: true });
  });

  it("replay clears ticks, hints and shows the panel again", () => {
    const s = useGuideStore.getState();
    s.complete(["add-task"]);
    s.hidePanel();
    s.dismissHint("week");
    s.replay();
    const after = useGuideStore.getState();
    expect(after.done).toEqual({});
    expect(after.dismissedHints).toEqual({});
    expect(after.panelHidden).toBe(false);
  });

  it("ignores corrupt saved data", () => {
    window.localStorage.setItem("weekflow:demo:guide", "{not json");
    useGuideStore.persist.rehydrate();
    expect(useGuideStore.getState().done).toEqual({});
  });
});
