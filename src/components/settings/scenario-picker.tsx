"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadScenario } from "@/data/tasks";
import { SCENARIOS } from "@/domain/scenarios";

/** Replace the demo tasks with a ready-made situation, to see the app in that state. */
export function ScenarioPicker() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {SCENARIOS.map((scenario) => (
        <li key={scenario.id} className="flex flex-col justify-between gap-3 rounded-2xl border bg-card p-4">
          <div>
            <p className="text-sm font-semibold">{scenario.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="self-start"
            onClick={() => {
              loadScenario(scenario.id);
              toast.success(`Loaded: ${scenario.label}`);
            }}
          >
            Load this week
          </Button>
        </li>
      ))}
    </ul>
  );
}
