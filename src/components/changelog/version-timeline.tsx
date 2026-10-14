import { APP_VERSION, RELEASES } from "@/generated/version";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Release timeline generated from CHANGELOG.md (via the generated version module). */
export function VersionTimeline() {
  return (
    <section className="rounded-3xl bg-sidebar p-6 text-sidebar-foreground shadow-lift md:p-8">
      <h2 className="text-2xl font-semibold">Version history</h2>
      <p className="mt-2 max-w-xl text-sm text-sidebar-muted">
        We keep track of every update. The version number changes only after a phase is finished and
        tested.
      </p>

      <ol className="mt-8 space-y-8 border-l border-sidebar-border pl-7">
        {RELEASES.map((release) => {
          const current = release.version === APP_VERSION;
          return (
            <li key={release.version} className="relative">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-[2.17rem] size-3.5 rounded-full border-2 border-sidebar bg-sidebar-primary ring-2 ring-sidebar-primary/40"
              />
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="text-xl font-semibold tabular-nums">{release.version}</h3>
                {current ? (
                  <span className="rounded-full bg-sidebar-primary px-3 py-0.5 text-xs font-semibold text-sidebar-primary-foreground">
                    Current version
                  </span>
                ) : null}
                <time dateTime={release.date} className="text-sm text-sidebar-muted">
                  {formatDate(release.date)}
                </time>
              </div>
              <p className="mt-1 font-medium">{release.title}</p>
              <p className="mt-1 max-w-2xl text-sm text-sidebar-muted">{release.summary}</p>
              {release.changes.length > 0 ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer rounded-md font-medium text-sidebar-foreground underline-offset-4 hover:underline">
                    What changed ({release.changes.length})
                  </summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sidebar-muted">
                    {release.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
