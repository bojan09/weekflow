export interface Release {
  version: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  summary: string;
  changes: string[];
}

const HEADING = /^##\s+(\d+\.\d+\.\d+)\s+[—-]\s+(.+?)\s*$/;
const DATE_LINE = /^Date:\s*(\d{4}-\d{2}-\d{2})\s*$/;
const SUMMARY_LINE = /^Summary:\s*(.+?)\s*$/;
const BULLET = /^[-*]\s+(.+?)\s*$/;

/**
 * Parse CHANGELOG.md into releases, newest first (file order).
 * Throws on a malformed entry so a bad changelog fails the build.
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let current: Release | null = null;

  const finish = (): void => {
    if (!current) return;
    if (!current.date) throw new Error(`Release ${current.version} is missing "Date:"`);
    if (!current.summary) throw new Error(`Release ${current.version} is missing "Summary:"`);
    releases.push(current);
    current = null;
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = HEADING.exec(line);
    if (heading) {
      finish();
      current = {
        version: heading[1] ?? "",
        title: heading[2] ?? "",
        date: "",
        summary: "",
        changes: [],
      };
      continue;
    }
    if (!current) continue;
    const date = DATE_LINE.exec(line);
    if (date) {
      current.date = date[1] ?? "";
      continue;
    }
    const summary = SUMMARY_LINE.exec(line);
    if (summary) {
      current.summary = summary[1] ?? "";
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) current.changes.push(bullet[1] ?? "");
  }
  finish();

  const seen = new Set<string>();
  for (const release of releases) {
    if (seen.has(release.version)) throw new Error(`Duplicate release ${release.version}`);
    seen.add(release.version);
  }
  return releases;
}
