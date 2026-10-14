"use client";

import {
  NativeSelect,
  NumberField,
  Notice,
  RangeField,
  SettingRow,
  SettingsGroup,
  ToggleRow,
} from "@/components/settings/controls";
import { usePrefsStore } from "@/prefs/store";

export function EnginePane() {
  const engine = usePrefsStore((s) => s.prefs.engine);
  const update = usePrefsStore((s) => s.update);

  return (
    <div className="space-y-5">
      <Notice>
        The scheduling engine is deterministic: the same tasks and rules always produce the same
        plan, and every decision is explained. Use Plan my week to preview a plan with these rules.
        Block length is saved now and takes effect in a later release.
      </Notice>

      <SettingsGroup title="Behavior">
        <SettingRow label="Auto-rescheduling" description="What happens when a task runs past its time without being done. Automatic changes are saved to Schedule history and can be undone.">
          {(id) => (
            <NativeSelect
              id={id}
              value={engine.autoReschedule}
              onChange={(e) =>
                update("engine", { autoReschedule: e.target.value as typeof engine.autoReschedule })
              }
            >
              <option value="off">Never, I will replan myself</option>
              <option value="ask">Suggest a plan and ask me first</option>
              <option value="auto">Replan automatically</option>
            </NativeSelect>
          )}
        </SettingRow>
        <ToggleRow
          label="Allow moving existing placements"
          description="When off, tasks already on your calendar stay where they are. Locked tasks never move."
          checked={engine.allowMoveExisting}
          onChange={(allowMoveExisting) => update("engine", { allowMoveExisting })}
        />
        <SettingRow label="Deadline behavior" description="Strict never places work past a deadline; soft allows it and flags the risk.">
          {(id) => (
            <NativeSelect
              id={id}
              value={engine.deadlineBehavior}
              onChange={(e) =>
                update("engine", { deadlineBehavior: e.target.value as typeof engine.deadlineBehavior })
              }
            >
              <option value="strict">Strict: never schedule late</option>
              <option value="soft">Soft: allow late and warn me</option>
            </NativeSelect>
          )}
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Priorities" description="How much each factor matters when two tasks compete for a slot.">
        <SettingRow label="Priority weight" description="Favor high-priority work.">
          {(id) => (
            <RangeField
              id={id}
              value={engine.weights.priority}
              onChange={(priority) => update("engine", { weights: { ...engine.weights, priority } })}
            />
          )}
        </SettingRow>
        <SettingRow label="Deadline weight" description="Favor work due soonest.">
          {(id) => (
            <RangeField
              id={id}
              value={engine.weights.deadline}
              onChange={(deadline) => update("engine", { weights: { ...engine.weights, deadline } })}
            />
          )}
        </SettingRow>
        <SettingRow label="Stability weight" description="At 5 or more, Plan my week only moves tasks that break a rule. Below 5 it may re-plan every unlocked task.">
          {(id) => (
            <RangeField
              id={id}
              value={engine.weights.stability}
              onChange={(stability) => update("engine", { weights: { ...engine.weights, stability } })}
            />
          )}
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Block length" description="Saved now. Splitting long tasks into blocks arrives in a later release.">
        <SettingRow label="Minimum block">
          {(id) => (
            <NumberField
              id={id}
              value={engine.minBlockMin}
              min={15}
              max={240}
              step={15}
              unit="minutes"
              onChange={(minBlockMin) =>
                update("engine", { minBlockMin, maxBlockMin: Math.max(engine.maxBlockMin, minBlockMin) })
              }
            />
          )}
        </SettingRow>
        <SettingRow label="Maximum block">
          {(id) => (
            <NumberField
              id={id}
              value={engine.maxBlockMin}
              min={30}
              max={480}
              step={15}
              unit="minutes"
              onChange={(maxBlockMin) =>
                update("engine", { maxBlockMin, minBlockMin: Math.min(engine.minBlockMin, maxBlockMin) })
              }
            />
          )}
        </SettingRow>
      </SettingsGroup>
    </div>
  );
}
