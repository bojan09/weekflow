"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Hourglass, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Term } from "@/components/guide/term";
import { searchGuide } from "@/guide/search";
import { useGuideStore } from "@/guide/store";
import { termById } from "@/guide/terms";
import type { GuideSection } from "@/guide/types";
import { appPath } from "@/lib/routes";

function Contents({ sections, showGlossary }: { sections: readonly GuideSection[]; showGlossary: boolean }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex min-h-11 items-center rounded-lg px-3 hover:bg-muted">
            {s.title}
          </a>
        </li>
      ))}
      {showGlossary ? (
        <li>
          <a href="#glossary" className="flex min-h-11 items-center rounded-lg px-3 hover:bg-muted">
            Glossary
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft md:p-6"
    >
      <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-tight">
        {section.title}
      </h2>
      {section.comingIn ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-info-soft px-3 py-3 text-sm text-info-text">
          <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Arrives in version {section.comingIn}. {section.whatItIs}
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-prose text-sm">{section.whatItIs}</p>
          {section.steps.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold">How to use it</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                {section.steps.map((step) => (
                  <li key={step.text}>
                    {step.text}
                    {step.to ? (
                      <>
                        {" "}
                        <Link
                          href={appPath(step.to.route, step.to.sub)}
                          className="font-medium text-primary-text hover:underline"
                        >
                          {step.to.label}
                        </Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          {section.tips.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold">Good to know</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {section.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </>
          ) : null}
          {section.shortcuts.length > 0 ? (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {section.shortcuts.map((k) => (
                <div key={k.keys} className="contents">
                  <dt>
                    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{k.keys}</kbd>
                  </dt>
                  <dd className="text-muted-foreground">{k.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {section.terms.length > 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold">Words:</span>
              {section.terms.map((id) => (
                <span key={id} className="inline-flex items-center">
                  {termById(id).word}
                  <Term id={id} />
                </span>
              ))}
            </p>
          ) : null}
          {section.tryIt ? (
            <Link
              href={appPath(section.tryIt.route, section.tryIt.sub)}
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {section.tryIt.label}
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}

export function GuideScreen() {
  const [query, setQuery] = useState("");
  const replay = useGuideStore((s) => s.replay);
  const result = useMemo(() => searchGuide(query), [query]);
  const empty = result.sections.length === 0 && result.terms.length === 0;

  return (
    <>
      <PageHeader
        title="Guide"
        subtitle="Everything in Weekflow, explained. Search, or jump to any part."
        actions={
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              replay();
              toast("Start here is back on Home.");
            }}
          >
            <RotateCcw aria-hidden="true" /> Replay Start here
          </Button>
        }
      />

      <div className="relative mb-5 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Search the guide"
          placeholder="Search the guide, for example “lock” or “buffer”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-xl border-input bg-card pl-9"
        />
      </div>
      <p role="status" className="sr-only">
        {query.trim() ? `${result.sections.length} sections, ${result.terms.length} words` : ""}
      </p>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-4 lg:self-start">
          <details className="rounded-2xl border bg-card p-2 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">On this page</summary>
            <Contents sections={result.sections} showGlossary={result.terms.length > 0} />
          </details>
          <div className="hidden rounded-2xl border bg-card p-2 lg:block">
            <Contents sections={result.sections} showGlossary={result.terms.length > 0} />
          </div>
        </nav>

        <div className="space-y-5">
          {empty ? (
            <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              Nothing matches “{query}”. Try a shorter word, or clear the search.
            </p>
          ) : null}
          {result.sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
          {result.terms.length > 0 ? (
            <section
              id="glossary"
              aria-labelledby="glossary-title"
              className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft md:p-6"
            >
              <h2 id="glossary-title" className="text-xl font-semibold tracking-tight">
                Glossary
              </h2>
              <dl className="mt-3 space-y-4">
                {result.terms.map((term) => (
                  <div key={term.id} id={`term-${term.id}`} className="scroll-mt-24">
                    <dt className="text-sm font-semibold">{term.word}</dt>
                    <dd className="mt-0.5 text-sm">{term.plain}</dd>
                    <dd className="mt-0.5 text-sm text-muted-foreground">{term.whyItMatters}</dd>
                    {term.setting ? (
                      <dd className="mt-1">
                        <Link
                          href={appPath(term.setting.route, term.setting.sub)}
                          className="text-sm font-medium text-primary-text hover:underline"
                        >
                          Open {term.setting.label}
                        </Link>
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
