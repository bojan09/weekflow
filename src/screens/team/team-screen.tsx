"use client";

import { useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { NativeSelect, SegmentedControl } from "@/components/settings/controls";
import { RoleBadge } from "@/components/team/common";
import { TeamAvailability } from "@/components/team/team-availability";
import { TeamMembers } from "@/components/team/team-members";
import { TeamTasks } from "@/components/team/team-tasks";
import { PageHeader } from "@/components/shell/page-header";
import { ResourceView } from "@/components/states/resource-view";
import { LoadingBlocks } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamCollection } from "@/data/team";
import { applyTeam } from "@/data/team-actions";
import { useCollection } from "@/data/use-collection";
import { renameWorkspace, setViewer, viewerOf } from "@/domain/team/ops";
import { can } from "@/domain/team/permissions";
import { ROLE_SUMMARY, type TeamState } from "@/domain/team/types";

type Tab = "tasks" | "members" | "availability";

function WorkspaceName({ state }: { state: TeamState }) {
  const viewer = viewerOf(state);
  const [name, setName] = useState(state.workspace.name);
  if (!can(viewer.role, "workspace.rename")) return null;
  return (
    <form
      noValidate
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (applyTeam((s, a) => renameWorkspace(s, a, name))) setName(name.trim());
      }}
    >
      <label htmlFor="ws-name" className="text-sm font-medium">
        Workspace name
      </label>
      <Input id="ws-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-9 w-56 rounded-xl border-input bg-card" />
      <Button type="submit" variant="outline" size="lg" className="h-9">
        Rename
      </Button>
    </form>
  );
}

function TeamBody({ state }: { state: TeamState }) {
  const [tab, setTab] = useState<Tab>("tasks");
  const viewer = viewerOf(state);

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-info-border bg-info-soft px-4 py-3 text-sm text-info-text">
        <p className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            A preview on sample data. Nothing here is shared with anyone yet: real teams, invitations and sync arrive with accounts. Use
            &ldquo;View as&rdquo; to see what each role can do.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 text-foreground">
          <label htmlFor="view-as" className="text-sm font-medium">
            View as
          </label>
          <NativeSelect
            id="view-as"
            value={state.viewerId}
            onChange={(e) => teamCollection.write(setViewer(teamCollection.getSnapshot(), e.target.value))}
            className="h-9 min-w-52"
          >
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
          <RoleBadge role={viewer.role} />
          <Button variant="ghost" size="sm" onClick={() => teamCollection.reset()}>
            <RotateCcw aria-hidden="true" /> Reset sample team
          </Button>
        </div>
        <p className="text-foreground">
          <span className="font-medium">{viewer.name}</span>: {ROLE_SUMMARY[viewer.role]}
        </p>
      </div>

      <WorkspaceName key={state.workspace.name} state={state} />

      <SegmentedControl<Tab>
        label="Team section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "tasks", label: "Tasks" },
          { value: "members", label: "People" },
          { value: "availability", label: "Availability" },
        ]}
        className="max-w-md flex-nowrap [&>button]:min-h-9 [&>button]:min-w-0 [&>button]:px-3"
      />

      {tab === "tasks" ? <TeamTasks state={state} viewer={viewer} /> : null}
      {tab === "members" ? <TeamMembers state={state} viewer={viewer} /> : null}
      {tab === "availability" ? <TeamAvailability state={state} /> : null}
    </div>
  );
}

export function TeamScreen() {
  const state = useCollection(teamCollection);
  return (
    <>
      <PageHeader
        title="Team"
        subtitle={state.status === "ready" ? `${state.data.workspace.name} · free for every team` : "Shared work, kept apart from your personal plan."}
      />
      <ResourceView state={state} loading={<LoadingBlocks rows={4} />}>
        {(data) => <TeamBody state={data} />}
      </ResourceView>
    </>
  );
}
