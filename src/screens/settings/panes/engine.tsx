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
        plan, and every decision is explained. It arrives in version 0.0.3; these settings are saved
        now and become its rules.
      </Notice>

      <SettingsGroup title="Behavior">
        <SettingRow label="Auto-rescheduling" description="What happens when a task is missed or plans change.">
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
        <SettingRow label="Stability weight" description="Prefer leaving existing tasks where they are.">
          {(id) => (
            <RangeField
              id={id}
              value={engine.weights.stability}
              onChange={(stability) => update("engine", { weights: { ...engine.weights, stability } })}
            />
          )}
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Block length" description="Long tasks are split into blocks within this range.">
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
