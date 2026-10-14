"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { ResourceView } from "@/components/states/resource-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/settings/controls";
import { profileCollection } from "@/data/profile";
import { useCollection } from "@/data/use-collection";
import { LOCALES, initialsOf, profileEditSchema, type Profile, type ProfileEdit } from "@/domain/profile";
import { cn } from "@/lib/utils";

const FORM_ID = "profile-form";

function formatJoined(joinedAt: string, locale: string): string {
  return new Date(`${joinedAt}T00:00:00Z`).toLocaleDateString(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

function timeZones(current: string): string[] {
  const zones =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return zones.includes(current) ? zones : [current, ...zones];
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b py-[var(--row-y)] last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
      <dt className="text-sm text-muted-foreground">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading profile" className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

function ProfileForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [draft, setDraft] = useState<ProfileEdit>({
    fullName: profile.fullName,
    bio: profile.bio,
    timeZone: profile.timeZone,
    locale: profile.locale,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileEdit, string>>>({});

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = profileEditSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Partial<Record<keyof ProfileEdit, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileEdit | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    profileCollection.write({ ...profile, ...parsed.data });
    toast.success("Profile saved");
    onDone();
  };

  const field = <K extends keyof ProfileEdit>(key: K, value: ProfileEdit[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <form id={FORM_ID} onSubmit={submit} noValidate>
      <dl>
        <Row label="Full name" htmlFor="pf-name">
          <Input
            id="pf-name"
            value={draft.fullName}
            onChange={(e) => field("fullName", e.target.value)}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "pf-name-error" : undefined}
            className="h-10 max-w-md rounded-xl border-input bg-card"
          />
          {errors.fullName ? (
            <p id="pf-name-error" role="alert" className="mt-1.5 text-xs text-danger-text">
              {errors.fullName}
            </p>
          ) : null}
        </Row>
        <Row label="Email">
          <span className="block">{profile.email}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Your email belongs to your account and can be changed once accounts launch.
          </span>
        </Row>
        <Row label="Bio" htmlFor="pf-bio">
          <Textarea
            id="pf-bio"
            value={draft.bio}
            rows={3}
            onChange={(e) => field("bio", e.target.value)}
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? "pf-bio-error" : undefined}
            className="max-w-md rounded-xl border-input bg-card"
          />
          <p className={cn("mt-1 text-xs", errors.bio ? "text-danger-text" : "text-muted-foreground")} id="pf-bio-error">
            {errors.bio ?? `${draft.bio.length}/280`}
          </p>
        </Row>
        <Row label="Time zone" htmlFor="pf-tz">
          <NativeSelect
            id="pf-tz"
            value={draft.timeZone}
            onChange={(e) => field("timeZone", e.target.value)}
            className="sm:min-w-72"
          >
            {timeZones(draft.timeZone).map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </NativeSelect>
        </Row>
        <Row label="Locale" htmlFor="pf-locale">
          <NativeSelect
            id="pf-locale"
            value={draft.locale}
            onChange={(e) => field("locale", e.target.value as ProfileEdit["locale"])}
            className="sm:min-w-72"
          >
            {LOCALES.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.label}
              </option>
            ))}
          </NativeSelect>
        </Row>
        <Row label="Joined">{formatJoined(profile.joinedAt, profile.locale)}</Row>
      </dl>
    </form>
  );
}

function ProfileDetails({ profile }: { profile: Profile }) {
  const locale = LOCALES.find((l) => l.id === profile.locale)?.label ?? profile.locale;
  return (
    <dl>
      <Row label="Full name">{profile.fullName}</Row>
      <Row label="Email">{profile.email}</Row>
      <Row label="Bio">{profile.bio || <span className="text-muted-foreground">No bio yet</span>}</Row>
      <Row label="Time zone">{profile.timeZone}</Row>
      <Row label="Locale">{locale}</Row>
      <Row label="Joined">{formatJoined(profile.joinedAt, profile.locale)}</Row>
    </dl>
  );
}

function SecurityCard() {
  const items = [
    { label: "Password", text: "Change your password" },
    { label: "Sign out", text: "Sign out of this device" },
    { label: "Delete account", text: "Permanently remove your account and data" },
  ];
  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <h2 className="text-base font-semibold">Account security</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The demo has no account to secure. These arrive with sign-in in version 0.1.0.
      </p>
      <ul className="mt-3 divide-y">
        {items.map((item) => (
          <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>
              <span className="block font-medium">{item.label}</span>
              <span className="block text-muted-foreground">{item.text}</span>
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Available in 0.1.0
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProfileScreen() {
  const state = useCollection(profileCollection);
  const [editing, setEditing] = useState(false);
  const ready = state.status === "ready";

  const actions = !ready ? null : editing ? (
    <>
      <Button variant="outline" size="lg" onClick={() => setEditing(false)}>
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} size="lg">
        Save
      </Button>
    </>
  ) : (
    <Button variant="outline" size="lg" onClick={() => setEditing(true)}>
      <Pencil aria-hidden="true" /> Edit
    </Button>
  );

  return (
    <>
      <PageHeader title="Profile" subtitle="Your personal details" actions={actions} />
      <div className="mx-auto max-w-3xl space-y-6">
        <ResourceView state={state} loading={<ProfileSkeleton />}>
          {(profile) => (
            <>
              <section className="rounded-3xl border bg-card p-6 shadow-soft">
                <div className="flex items-center gap-5 border-b pb-6">
                  <span
                    aria-hidden="true"
                    className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xl font-semibold text-primary-soft-text ring-4 ring-background"
                  >
                    {initialsOf(profile.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold">{profile.fullName}</p>
                    <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                {editing ? (
                  <ProfileForm profile={profile} onDone={() => setEditing(false)} />
                ) : (
                  <ProfileDetails profile={profile} />
                )}
              </section>
              <SecurityCard />
            </>
          )}
        </ResourceView>
      </div>
    </>
  );
}
