import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { profileSchema } from "@/domain/profile";
import { createLocalCollection } from "./collection";
import { profileCollection } from "./profile";
import { useSimulator } from "./simulator";
import { useCollection } from "./use-collection";

const schema = z.object({ count: z.number().int() });
const make = () =>
  createLocalCollection({ key: "test:counter", schema, seed: () => ({ count: 0 }) });

beforeEach(() => {
  window.localStorage.clear();
  useSimulator.setState({ mode: "none" });
});

describe("local collection", () => {
  it("returns the seed when nothing is stored", () => {
    expect(make().getSnapshot()).toEqual({ count: 0 });
  });

  it("returns a stable reference between changes", () => {
    const c = make();
    expect(c.getSnapshot()).toBe(c.getSnapshot());
  });

  it("persists writes and notifies subscribers", () => {
    const c = make();
    let calls = 0;
    const off = c.subscribe(() => {
      calls += 1;
    });
    c.write({ count: 3 });
    expect(c.getSnapshot()).toEqual({ count: 3 });
    expect(calls).toBe(1);
    off();
    c.write({ count: 4 });
    expect(calls).toBe(1);
  });

  it("rejects values that fail the schema", () => {
    const c = make();
    expect(() => c.write({ count: 1.5 })).toThrow();
    expect(c.getSnapshot()).toEqual({ count: 0 });
  });

  it("falls back to the seed for corrupt or invalid stored data", () => {
    window.localStorage.setItem("test:counter", "{oops");
    expect(make().getSnapshot()).toEqual({ count: 0 });
    window.localStorage.setItem("test:counter", JSON.stringify({ count: "x" }));
    expect(make().getSnapshot()).toEqual({ count: 0 });
  });

  it("reset restores the seed", () => {
    const c = make();
    c.write({ count: 9 });
    c.reset();
    expect(c.getSnapshot()).toEqual({ count: 0 });
  });
});

describe("useCollection", () => {
  it("reports ready with the stored value", () => {
    const c = make();
    c.write({ count: 5 });
    const { result } = renderHook(() => useCollection(c));
    expect(result.current).toEqual({ status: "ready", data: { count: 5 } });
  });

  it("re-renders when the collection changes", () => {
    const c = make();
    const { result } = renderHook(() => useCollection(c));
    act(() => c.write({ count: 2 }));
    expect(result.current).toEqual({ status: "ready", data: { count: 2 } });
  });

  it("shows each simulated state", () => {
    const c = make();
    const { result } = renderHook(() => useCollection(c));
    act(() => useSimulator.getState().setMode("loading"));
    expect(result.current.status).toBe("loading");
    act(() => useSimulator.getState().setMode("denied"));
    expect(result.current.status).toBe("denied");
    act(() => useSimulator.getState().setMode("error"));
    expect(result.current.status).toBe("error");
  });

  it("retry on a simulated error returns to normal", () => {
    const c = make();
    const { result } = renderHook(() => useCollection(c));
    act(() => useSimulator.getState().setMode("error"));
    const state = result.current;
    expect(state.status).toBe("error");
    act(() => {
      if (state.status === "error") state.retry();
    });
    expect(result.current.status).toBe("ready");
  });
});

describe("profile collection", () => {
  it("seeds a valid demo profile", () => {
    expect(profileSchema.safeParse(profileCollection.getSnapshot()).success).toBe(true);
  });

  it("rejects an invalid edit", () => {
    const profile = profileCollection.getSnapshot();
    expect(() => profileCollection.write({ ...profile, fullName: "" })).toThrow();
    expect(() => profileCollection.write({ ...profile, timeZone: "Mars/Olympus" })).toThrow();
  });
});
