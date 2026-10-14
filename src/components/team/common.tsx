"use client";

import { TASK_STYLE } from "@/components/tasks/task-style";
import { initialsOf } from "@/domain/profile";
import { ROLE_LABEL, type Member, type Role } from "@/domain/team/types";
import { cn } from "@/lib/utils";

/** A person's initials on their colour. Decorative: the name is always written next to it. */
export function MemberAvatar({ member, className }: { member: Pick<Member, "name" | "hue">; className?: string }) {
  const look = TASK_STYLE[member.hue];
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", look.surface, look.title, className)}
    >
      {initialsOf(member.name)}
    </span>
  );
}

const ROLE_TONE: Record<Role, string> = {
  owner: "bg-primary-soft text-primary-soft-text",
  admin: "bg-info-soft text-info-text",
  member: "bg-success-soft text-success-text",
  viewer: "bg-muted text-muted-foreground",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", ROLE_TONE[role])}>{ROLE_LABEL[role]}</span>;
}
