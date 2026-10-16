import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { usePrefsStore } from "@/prefs/store";
import { DEFAULT_PREFS } from "@/prefs/schema";
import { usePlannerStore } from "@/stores/planner";
vi.mock("./use-now", () => ({ useNow: () => ({ date: "2026-10-16", minutes: 900 }) }));
import { usePlanner } from "./use-planner";
beforeEach(() => {
  usePlannerStore.setState({ anchor: null, view: null });
  usePrefsStore.setState({ prefs: { ...DEFAULT_PREFS, calendar: { ...DEFAULT_PREFS.calendar, weekStart: "sunday" } } });
});
it("opens the current Monday–Sunday week independently of month-calendar ordering", () => {
  const { result } = renderHook(() => usePlanner());
  expect(result.current.week).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
  act(() => result.current.step(-1));
  expect(result.current.week[0]).toBe("2026-10-05");
  act(() => result.current.goToday());
  expect(result.current.week[0]).toBe("2026-10-12");
});
