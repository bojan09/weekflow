import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { VersionTimeline } from "@/components/changelog/version-timeline";

export const metadata: Metadata = { title: "Version history" };

export default function Page() {
  return (
    <>
      <PageHeader title="Version history" subtitle="Every release of Weekflow and what changed." />
      <div className="mx-auto max-w-3xl">
        <VersionTimeline />
      </div>
    </>
  );
}
