"use client";

import { useState, type FormEvent } from "react";
import { MailPlus, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/settings/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyTeam, newId } from "@/data/team-actions";
import * as ops from "@/domain/team/ops";
import { can, canChangeRole, canRemoveMember } from "@/domain/team/permissions";
import { ROLES, ROLE_LABEL, ROLE_SUMMARY, type Member, type Role, type TeamState } from "@/domain/team/types";
import { MemberAvatar, RoleBadge } from "./common";

function MemberRow({ member, state, viewer }: { member: Member; state: TeamState; viewer: Member }) {
  const isYou = member.id === viewer.id;
  const roleOptions = ROLES.map((role) => ({ role, decision: canChangeRole(viewer, member, role, state.members) }));
  const mayChange = !isYou && roleOptions.some((o) => o.role !== member.role && o.decision.ok);
  const removal = canRemoveMember(viewer, member, state.members);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-card p-3">
      <MemberAvatar member={member} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {isYou ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">You</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      {mayChange ? (
        <NativeSelect
          aria-label={`Role of ${member.name}`}
          value={member.role}
          onChange={(e) => applyTeam((s, a) => ops.changeRole(s, a, member.id, e.target.value as Role))}
          className="h-9 min-w-32"
        >
          {roleOptions.map(({ role, decision }) => (
            <option key={role} value={role} disabled={role !== member.role && !decision.ok}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </NativeSelect>
      ) : (
        <RoleBadge role={member.role} />
      )}
      {removal.ok ? (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={`Remove ${member.name}`}
          onClick={() => {
            if (applyTeam((s, a) => ops.removeMember(s, a, member.id))) toast(`${member.name} was removed. Their tasks are now unassigned.`);
          }}
        >
          <UserMinus aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}

function Invite({ viewer }: { viewer: Member }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("member");
  if (!can(viewer.role, "member.invite")) {
    return <p className="rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">Only owners and admins can invite people.</p>;
  }
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (applyTeam((s, a) => ops.inviteMember(s, a, email, role, newId(), new Date().toISOString()))) {
      toast("Invitation saved. In the demo no email is sent.");
      setEmail("");
    }
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap gap-2">
      <Input
        type="email"
        aria-label="Email to invite"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-10 min-w-48 flex-1 rounded-xl border-input bg-card"
      />
      <NativeSelect aria-label="Role for the invitation" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, "owner">)} className="h-10 min-w-32">
        <option value="admin">Admin</option>
        <option value="member">Member</option>
        <option value="viewer">Viewer</option>
      </NativeSelect>
      <Button type="submit" size="lg" className="h-10">
        <MailPlus aria-hidden="true" /> Invite
      </Button>
    </form>
  );
}

export function TeamMembers({ state, viewer }: { state: TeamState; viewer: Member }) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="team-people" className="space-y-3">
        <h2 id="team-people" className="text-sm font-semibold">
          People ({state.members.length})
        </h2>
        <ul className="space-y-2">
          {state.members.map((member) => (
            <MemberRow key={member.id} member={member} state={state} viewer={viewer} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="team-invites" className="space-y-3">
        <h2 id="team-invites" className="text-sm font-semibold">
          Invitations ({state.invitations.length})
        </h2>
        <Invite viewer={viewer} />
        {state.invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="space-y-2">
            {state.invitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">Pending · {ROLE_LABEL[invitation.role]}</p>
                </div>
                {can(viewer.role, "member.invite") ? (
                  <Button variant="ghost" size="icon-lg" aria-label={`Cancel invitation for ${invitation.email}`} onClick={() => applyTeam((s, a) => ops.cancelInvitation(s, a, invitation.id))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="team-roles" className="rounded-2xl border bg-card p-4">
        <h2 id="team-roles" className="text-sm font-semibold">
          What each role can do
        </h2>
        <dl className="mt-2 space-y-2 text-sm">
          {ROLES.map((role) => (
            <div key={role}>
              <dt className="font-medium">{ROLE_LABEL[role]}</dt>
              <dd className="text-muted-foreground">{ROLE_SUMMARY[role]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
