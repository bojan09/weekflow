import { WeekflowMark } from "@/components/brand/logo";

type Hue = "lavender" | "blue" | "teal" | "green" | "amber" | "orange" | "pink";

interface Block {
  title: string;
  top: number;
  height: number;
  hue: Hue;
}

const HUE_CLASS: Record<Hue, string> = {
  lavender: "border-task-lavender-bar bg-task-lavender-bg text-task-lavender-fg",
  blue: "border-task-blue-bar bg-task-blue-bg text-task-blue-fg",
  teal: "border-task-teal-bar bg-task-teal-bg text-task-teal-fg",
  green: "border-task-green-bar bg-task-green-bg text-task-green-fg",
  amber: "border-task-amber-bar bg-task-amber-bg text-task-amber-fg",
  orange: "border-task-orange-bar bg-task-orange-bg text-task-orange-fg",
  pink: "border-task-pink-bar bg-task-pink-bg text-task-pink-fg",
};

const DAYS: Array<{ name: string; blocks: Block[] }> = [
  { name: "Mon", blocks: [
    { title: "Deep work", top: 6, height: 26, hue: "lavender" },
    { title: "Planning", top: 36, height: 18, hue: "blue" },
    { title: "Review", top: 62, height: 22, hue: "green" },
  ] },
  { name: "Tue", blocks: [
    { title: "Client call", top: 12, height: 18, hue: "orange" },
    { title: "Build", top: 34, height: 34, hue: "blue" },
  ] },
  { name: "Wed", blocks: [
    { title: "Research", top: 4, height: 24, hue: "teal" },
    { title: "Design", top: 32, height: 28, hue: "pink" },
    { title: "Docs", top: 66, height: 18, hue: "lavender" },
  ] },
  { name: "Thu", blocks: [
    { title: "Focus", top: 8, height: 30, hue: "lavender" },
    { title: "Sync", top: 44, height: 16, hue: "amber" },
    { title: "Ship", top: 64, height: 24, hue: "green" },
  ] },
  { name: "Fri", blocks: [
    { title: "Wrap up", top: 10, height: 20, hue: "blue" },
    { title: "Plan next week", top: 40, height: 26, hue: "teal" },
  ] },
];

/** Decorative preview of the week calendar, built from the real task tokens. */
export function LandingPreview() {
  return (
    <div
      aria-hidden="true"
      className="flex overflow-hidden rounded-3xl border bg-card shadow-lift"
    >
      <div className="hidden w-[22%] shrink-0 flex-col gap-2 bg-sidebar p-4 sm:flex">
        <WeekflowMark className="mb-3 size-6" />
        <div className="h-7 rounded-lg bg-sidebar-primary" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-5 rounded-md bg-sidebar-hover" />
        ))}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-4 w-32 rounded-full bg-foreground/80" />
          <div className="flex gap-1.5">
            <div className="h-6 w-14 rounded-full bg-muted" />
            <div className="size-6 rounded-full bg-primary-soft" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {DAYS.map((day) => (
            <div key={day.name}>
              <p className="mb-1.5 text-center text-[11px] font-medium text-muted-foreground">{day.name}</p>
              <div className="relative h-56 rounded-lg bg-muted/60 sm:h-64">
                {day.blocks.map((block) => (
                  <div
                    key={block.title}
                    className={`absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight font-medium ${HUE_CLASS[block.hue]}`}
                    style={{ top: `${block.top}%`, height: `${block.height}%` }}
                  >
                    {block.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
