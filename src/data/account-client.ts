import { resourceSchemas, type AccountSnapshot, type Resource } from "./account-schema";

type SyncStatus = "loading" | "saved" | "saving" | "error";
interface State { status: SyncStatus; message: string; snapshot: AccountSnapshot | null }
interface Scope { id: string; state: State; dirty: Set<Resource>; versions: Map<Resource, number>; running: boolean; loading?: Promise<void> }
const idle: State = { status: "loading", message: "", snapshot: null };
const scopes = new Map<string, Scope>();
let active: Scope | null = null;
let unloadGuard = false;
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
const publish = (scope: Scope, patch: Partial<State>) => { scope.state = { ...scope.state, ...patch }; if (scope === active) emit(); };

function guardUnsavedChanges() {
  if (unloadGuard || typeof window === "undefined") return;
  unloadGuard = true;
  window.addEventListener("beforeunload", (event) => {
    if ([...scopes.values()].some((scope) => scope.dirty.size > 0)) { event.preventDefault(); event.returnValue = ""; }
  });
}

/** Separate in-memory queues survive client navigation, and every request is
 * bound to the original account. A shared cookie changing cannot retarget it.
 */
export const accountSync = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => active?.state ?? idle,
  isActive: () => active !== null,
  hasPending: () => (active?.dirty.size ?? 0) > 0,
  read(resource: Resource): unknown { return active?.state.snapshot?.[resource].value; },
  async start(id: string): Promise<void> {
    guardUnsavedChanges();
    let scope = scopes.get(id);
    if (!scope) {
      scope = { id, state: idle, dirty: new Set(), versions: new Map(), running: false };
      scopes.set(id, scope);
    }
    active = scope; emit();
    if (scope.dirty.size > 0) return;
    if (scope.loading) return scope.loading;
    const current = scope;
    publish(current, { status: "loading", snapshot: null, message: "" });
    current.loading = (async () => {
      try {
        const response = await fetch("/api/data", { cache: "no-store", credentials: "same-origin", headers: { "X-Weekflow-Account": id } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load your planner.");
        const snapshot = {} as AccountSnapshot;
        for (const resource of Object.keys(resourceSchemas) as Resource[]) {
          const saved = data[resource];
          if (!Number.isSafeInteger(saved?.revision) || saved.revision < 0) throw new Error("The saved planner could not be read.");
          snapshot[resource] = { revision: saved.revision, value: resourceSchemas[resource].parse(saved.value) };
        }
        publish(current, { status: "saved", snapshot });
      } catch (error) { publish(current, { status: "error", message: error instanceof Error ? error.message : "Could not load your planner." }); }
      finally { current.loading = undefined; }
    })();
    return current.loading;
  },
  stop() { active = null; emit(); },
  write(resource: Resource, value: unknown) {
    const scope = active;
    if (!scope?.state.snapshot) throw new Error("Your planner is still loading.");
    if (scope.state.status === "error") throw new Error("Resolve the sync error before making more changes.");
    const valid = resourceSchemas[resource].parse(value);
    scope.state = { ...scope.state, snapshot: { ...scope.state.snapshot, [resource]: { ...scope.state.snapshot[resource], value: valid } } };
    scope.dirty.add(resource); scope.versions.set(resource, (scope.versions.get(resource) ?? 0) + 1);
    publish(scope, { status: "saving", message: "" });
    void flush(scope);
  },
  retry() {
    if (!active) return;
    if (active.state.snapshot) { publish(active, { status: "saving", message: "" }); void flush(active); }
    else void accountSync.start(active.id);
  },
  exportPending() { return JSON.stringify({ exportedAt: new Date().toISOString(), accountId: active?.id, resources: active?.state.snapshot }, null, 2); },
};

async function flush(scope: Scope) {
  if (scope.running || !scope.state.snapshot) return;
  scope.running = true;
  try {
    while (scope.dirty.size > 0 && scope.state.snapshot) {
      const resource = scope.dirty.values().next().value as Resource;
      const version = scope.versions.get(resource);
      const saved = scope.state.snapshot[resource];
      const response = await fetch(`/api/data/${resource}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Weekflow-Account": scope.id }, body: JSON.stringify(saved) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Changes could not be saved. They remain open in this tab.");
      const unchanged = scope.versions.get(resource) === version;
      scope.state = { ...scope.state, snapshot: { ...scope.state.snapshot, [resource]: { revision: result.revision, value: unchanged ? resourceSchemas[resource].parse(result.value) : scope.state.snapshot[resource].value } } };
      if (unchanged) scope.dirty.delete(resource);
      if (scope === active) emit();
    }
    publish(scope, { status: "saved" });
  } catch (error) { publish(scope, { status: "error", message: error instanceof Error ? error.message : "Changes are not saved yet." }); }
  finally { scope.running = false; }
}

export function resourceForKey(key: string): Resource | null {
  const resources: Record<string, Resource> = { tasks: "tasks", projects: "projects", templates: "templates", "schedule-history": "history", profile: "profile" };
  return resources[key.replace("weekflow:demo:", "")] ?? null;
}
