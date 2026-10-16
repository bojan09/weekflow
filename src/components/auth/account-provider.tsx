"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { accountSync } from "@/data/account-client";
import { type AuthUser, signOut } from "@/auth/api";
import { useAuthStore } from "@/auth/store";
import { usePrefsStore } from "@/prefs/store";
import { prefsSchema } from "@/prefs/schema";
import { useGuideStore } from "@/guide/store";
import { guideSchema } from "@/guide/schema";
import { useSimulator } from "@/data/simulator";
import { Button } from "@/components/ui/button";
import { AccountLoading } from "./account-loading";

function exportChanges() {
  const url = URL.createObjectURL(new Blob([accountSync.exportPending()], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = "weekflow-pending-changes.json"; link.click();
  URL.revokeObjectURL(url);
}

export function AccountProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { id, name, email, emailVerified } = user;
  const state = useSyncExternalStore(accountSync.subscribe, accountSync.getSnapshot, accountSync.getSnapshot);
  useEffect(() => { useAuthStore.getState().setUser({ id, name, email, emailVerified }); }, [id, name, email, emailVerified]);
  useEffect(() => {
    let disposed = false;
    let stopPrefs = () => {};
    let stopGuide = () => {};
    useSimulator.getState().setMode("none");
    void accountSync.start(id).then(() => {
      if (disposed || !accountSync.getSnapshot().snapshot) return;
      usePrefsStore.setState({ prefs: prefsSchema.parse(accountSync.read("prefs")), hydrated: true });
      useGuideStore.setState({ ...guideSchema.parse(accountSync.read("guide")), hydrated: true });
      stopPrefs = usePrefsStore.subscribe((next, previous) => {
        if (next.prefs !== previous.prefs) accountSync.write("prefs", next.prefs);
      });
      stopGuide = useGuideStore.subscribe((next, previous) => {
        if (next.done !== previous.done || next.panelHidden !== previous.panelHidden || next.dismissedHints !== previous.dismissedHints) {
          accountSync.write("guide", guideSchema.parse(next));
        }
      });
      setReady(true);
    });
    const guardNavigation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target || !accountSync.hasPending()) return;
      const url = new URL(target.getAttribute("href") || "", window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/app")) {
        event.preventDefault(); event.stopPropagation(); window.alert("Your planner has unsaved changes. Save or export them before leaving.");
      }
    };
    document.addEventListener("click", guardNavigation, true);
    return () => {
      disposed = true; stopPrefs(); stopGuide(); accountSync.stop();
      document.removeEventListener("click", guardNavigation, true);
      // Read the real demo preferences after navigation; captured defaults
      // must never overwrite the browser's existing demo state.
      if (!window.location.pathname.startsWith("/app")) {
        void usePrefsStore.persist.rehydrate();
        void useGuideStore.persist.rehydrate();
      }
    };
  }, [id]);

  if ((!state.snapshot || !ready) && state.status !== "error") return <AccountLoading />;
  if (!state.snapshot || !ready) return (
    <main className="mx-auto my-16 max-w-xl space-y-4 rounded-3xl border bg-card p-8">
      <h1 className="text-2xl font-semibold">Could not open your planner</h1>
      <p role={state.status === "error" ? "alert" : "status"}>{state.status === "error" ? state.message : "Loading your planner…"}</p>
      {state.status === "error" ? <Button onClick={() => window.location.reload()}>Try again</Button> : null}
      <Link className="block text-primary-text underline" href="/sign-in">Back to sign in</Link>
    </main>
  );

  return <>
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2 text-xs text-muted-foreground sm:px-6 sm:pt-3 sm:text-sm">
      <span>{state.status === "error" ? "Changes are not saved" : state.status === "saving" ? "Saving changes…" : "All changes saved"}</span>
      <Button className="hidden sm:inline-flex" variant="ghost" disabled={accountSync.hasPending()} onClick={async () => {
        try { await signOut(); window.location.assign(new URL("/sign-in", window.location.origin).href); }
        catch { window.alert("Could not sign out. Please try again."); }
      }}>Sign out</Button>
    </div>
    {state.status === "error" ? <section role="alert" className="mx-4 mt-3 space-y-3 rounded-2xl border border-danger-border bg-danger-soft p-4 text-danger-text">
      <p>{state.message} Keep this tab open until your changes are saved or exported.</p>
      <div className="flex gap-2"><Button variant="outline" onClick={() => accountSync.retry()}>Retry save</Button><Button variant="outline" onClick={exportChanges}>Export pending changes</Button></div>
    </section> : null}
    <div inert={state.status === "error"}>{children}</div>
  </>;
}
