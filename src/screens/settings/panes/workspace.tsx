"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  NativeSelect,
  NumberField,
  Notice,
  SegmentedControl,
  SettingRow,
  SettingsGroup,
} from "@/components/settings/controls";
import { TASK_STYLE } from "@/components/tasks/task-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutateTasks } from "@/data/tasks";
import { CATEGORIES, MAX_CUSTOM_CATEGORIES, TASK_HUES, allCategories, type Task, type TaskHue } from "@/domain/tasks";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/prefs/store";

const HUE_LABEL: Record<TaskHue, string> = {
  lavender: "Lavender",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  amber: "Amber",
  orange: "Orange",
  pink: "Pink",
  slate: "Slate",
};

const slug = (label: string): string => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

/** Add and remove your own task categories. The built-in eight always stay. */
function CustomCategories() {
  const custom = usePrefsStore((s) => s.prefs.workspace.customCategories);
  const update = usePrefsStore((s) => s.update);
  const [label, setLabel] = useState("");
  const [hue, setHue] = useState<TaskHue>("teal");
  const [error, setError] = useState("");

  const add = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = label.trim();
    if (trimmed === "") return setError("Give the category a name.");
    if (allCategories().some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) return setError("A category with that name already exists.");
    if (custom.length >= MAX_CUSTOM_CATEGORIES) return setError(`You can add up to ${MAX_CUSTOM_CATEGORIES} categories.`);
    const id = `c-${slug(trimmed) || "category"}-${Date.now().toString(36)}`;
    update("workspace", { customCategories: [...custom, { id, label: trimmed.slice(0, 24), hue }] });
    setLabel("");
    setError("");
  };

  return (
    <SettingsGroup title="Categories" description={`Eight built-in categories (${CATEGORIES.map((c) => c.label).join(", ")}) and up to ${MAX_CUSTOM_CATEGORIES} of your own.`}>
      <div className="space-y-3 py-[var(--row-y)]">
        {custom.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have not added any categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {custom.map((category) => (
              <li key={category.id} className="flex items-center gap-2 rounded-xl border p-2">
                <span className={cn("ml-1 size-3 shrink-0 rounded-full", TASK_STYLE[category.hue].dot)} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">{category.label}</span>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Delete ${category.label}`}
                  onClick={() => {
                    mutateTasks((tasks) =>
                      tasks.some((t) => t.category === category.id)
                        ? tasks.map((t) => (t.category === category.id ? { ...t, category: "work" } : t))
                        : (tasks as Task[]),
                    );
                    update("workspace", { customCategories: custom.filter((c) => c.id !== category.id) });
                    toast(`Deleted “${category.label}”. Its tasks moved to Work.`);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} noValidate className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="New category name"
              aria-invalid={error !== ""}
              placeholder="New category name"
              value={label}
              maxLength={24}
              onChange={(e) => {
                setLabel(e.target.value);
                setError("");
              }}
              className="h-10 min-w-40 flex-1 rounded-xl border-input bg-card"
            />
            <NativeSelect aria-label="New category colour" value={hue} onChange={(e) => setHue(e.target.value as TaskHue)} className="h-10 min-w-28">
              {TASK_HUES.map((h) => (
                <option key={h} value={h}>
                  {HUE_LABEL[h]}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" size="lg" className="h-10">
              <Plus aria-hidden="true" /> Add category
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-danger-text">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </SettingsGroup>
  );
}

export function WorkspacePane() {
  const workspace = usePrefsStore((s) => s.prefs.workspace);
  const update = usePrefsStore((s) => s.update);
  const [name, setName] = useState(workspace.name);
  const nameInvalid = name.trim().length === 0;

  return (
    <div className="space-y-5">
      <Notice>These defaults are used when you create tasks. Your own categories also show up in filters, the editor and the review.</Notice>
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
      <CustomCategories />
    </div>
  );
}
