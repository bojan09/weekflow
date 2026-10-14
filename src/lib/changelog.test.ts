import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseChangelog } from "./changelog";

const SAMPLE = `# Changelog

## 0.0.2 — Second
Date: 2026-11-01
Summary: Second release.

- Added a thing
- Fixed a thing

## 0.0.1 - First
Date: 2026-10-14
Summary: First release.
`;

describe("parseChangelog", () => {
  it("parses releases newest first, with changes", () => {
    const releases = parseChangelog(SAMPLE);
    expect(releases.map((r) => r.version)).toEqual(["0.0.2", "0.0.1"]);
    expect(releases[0]).toEqual({
      version: "0.0.2",
      title: "Second",
      date: "2026-11-01",
      summary: "Second release.",
      changes: ["Added a thing", "Fixed a thing"],
    });
    expect(releases[1]?.changes).toEqual([]);
  });

  it("rejects an entry without a date", () => {
    expect(() => parseChangelog("## 0.0.1 — X\nSummary: s\n")).toThrow(/Date/);
  });

  it("rejects an entry without a summary", () => {
    expect(() => parseChangelog("## 0.0.1 — X\nDate: 2026-10-14\n")).toThrow(/Summary/);
  });

  it("rejects duplicate versions", () => {
    const dup = "## 0.0.1 — A\nDate: 2026-10-14\nSummary: a\n\n## 0.0.1 — B\nDate: 2026-10-15\nSummary: b\n";
    expect(() => parseChangelog(dup)).toThrow(/Duplicate/);
  });
});

describe("single source of truth for the version", () => {
  const root = resolve(__dirname, "../..");

  it("package.json matches the newest CHANGELOG.md entry", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version: string };
    const releases = parseChangelog(readFileSync(resolve(root, "CHANGELOG.md"), "utf8"));
    expect(releases[0]?.version).toBe(pkg.version);
  });

  it("releases are ordered newest first", () => {
    const releases = parseChangelog(readFileSync(resolve(root, "CHANGELOG.md"), "utf8"));
    const dates = releases.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
