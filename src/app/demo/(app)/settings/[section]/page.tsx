import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { LoadingBlocks } from "@/components/states/states";
import { SettingsScreen } from "@/screens/settings/settings-screen";
import { SETTINGS_SECTION_IDS, isSettingsSection } from "@/screens/settings/sections";

export const metadata: Metadata = { title: "Settings" };

export function generateStaticParams() {
  return SETTINGS_SECTION_IDS.map((section) => ({ section }));
}

async function Section({ params }: { params: PageProps<"/demo/settings/[section]">["params"] }) {
  const { section } = await params;
  if (!isSettingsSection(section)) notFound();
  return <SettingsScreen section={section} />;
}

export default function Page(props: PageProps<"/demo/settings/[section]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Settings" subtitle="Customize Weekflow to fit the way you work" />
          <LoadingBlocks rows={3} />
        </>
      }
    >
      <Section params={props.params} />
    </Suspense>
  );
}
