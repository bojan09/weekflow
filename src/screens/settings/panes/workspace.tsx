"use client";

import { useState } from "react";
import {
  NumberField,
  Notice,
  SegmentedControl,
  SettingRow,
  SettingsGroup,
} from "@/components/settings/controls";
import { Input } from "@/components/ui/input";
import { usePrefsStore } from "@/prefs/store";

export function WorkspacePane() {
  const workspace = usePrefsStore((s) => s.prefs.workspace);
  const update = usePrefsStore((s) => s.update);
  const [name, setName] = useState(workspace.name);
  const nameInvalid = name.trim().length === 0;

  return (
    <div className="space-y-5">
      <Notice>These defaults are used when you create tasks, from version 0.0.2.</Notice>
      <SettingsGroup>
        <SettingRow label="Workspace name" description="Shown above your personal tasks.">
          {(id) => (
            <div>
              <Input
                id={id}
                value={name}
                maxLength={40}
                aria-invalid={nameInvalid}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) update("workspace", { name: e.target.value });
                }}
                className="h-10 w-full rounded-xl border-input bg-card sm:w-64"
              />
              {nameInvalid ? (
                <p role="alert" className="mt-1.5 text-xs text-danger-text">
                  Give your workspace a name.
                </p>
              ) : null}
            </div>
          )}
        </SettingRow>
        <SettingRow label="Default task length">
          {(id) => (
            <NumberField
              id={id}
              value={workspace.defaultDurationMin}
              min={5}
              max={480}
              step={5}
              unit="minutes"
              onChange={(defaultDurationMin) => update("workspace", { defaultDurationMin })}
            />
          )}
        </SettingRow>
        <SettingRow label="Default priority" stacked>
          <SegmentedControl
            label="Default priority"
            value={workspace.defaultPriority}
            onChange={(defaultPriority) => update("workspace", { defaultPriority })}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
