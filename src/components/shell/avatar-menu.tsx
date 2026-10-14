"use client";

import Link from "next/link";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { profileCollection } from "@/data/profile";
import { useCollection } from "@/data/use-collection";
import { initialsOf } from "@/domain/profile";
import { appPath } from "@/lib/routes";
import { usePrefsStore } from "@/prefs/store";
import type { ThemePref } from "@/prefs/apply";

export function AvatarMenu() {
  const profile = useCollection(profileCollection);
  const theme = usePrefsStore((s) => s.prefs.appearance.theme);
  const update = usePrefsStore((s) => s.update);
  const initials = profile.status === "ready" ? initialsOf(profile.data.fullName) : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar className="size-11 sm:size-10">
          <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary-soft-text">
            {initials || " "}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium text-foreground">
              {profile.status === "ready" ? profile.data.fullName : "Account"}
            </span>
            {profile.status === "ready" ? (
              <span className="text-xs font-normal text-muted-foreground">{profile.data.email}</span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={appPath("profile")} />}>Profile</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={appPath("settings")} />}>Settings</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={appPath("guide")} />}>Guide</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={appPath("changelog")} />}>Version history</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => update("appearance", { theme: value as ThemePref })}
          >
            <DropdownMenuRadioItem value="light">
              <Sun aria-hidden="true" /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon aria-hidden="true" /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor aria-hidden="true" /> System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />}>
          <LogOut aria-hidden="true" /> Exit demo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
