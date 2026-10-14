"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { useConnectivity } from "@/data/use-online";
import { APP_VERSION, BUILD_DATE } from "@/generated/version";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/nav";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function isActiveRoute(pathname: string, item: NavItem): boolean {
  const path = appPath(item.route);
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={appPath(item.route)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-[calc(0.65rem*var(--density))] text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { online } = useConnectivity();

  return (
    <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 flex-col surface-sidebar rounded-3xl p-4 text-sidebar-foreground shadow-lift lg:flex">
      <Link
        href={appPath("home")}
        className="mb-6 flex items-center rounded-xl px-2 pt-2 text-sidebar-foreground"
        aria-label="Weekflow home"
      >
        <Logo wordmarkClassName="text-sidebar-foreground" />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.route} item={item} active={isActiveRoute(pathname, item)} />
        ))}
      </nav>

      <div className="my-4 h-px bg-sidebar-border" role="separator" />

      <nav aria-label="Account" className="flex flex-col gap-1">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.route} item={item} active={isActiveRoute(pathname, item)} />
        ))}
      </nav>

      <div className="mt-auto flex items-start gap-2.5 px-2 pt-6 text-xs text-sidebar-muted">
        <span
          role="img"
          aria-label={online ? "Online" : "Offline"}
          className={cn("mt-1 size-2 shrink-0 rounded-full", online ? "bg-success" : "bg-warning")}
        />
        <div className="leading-relaxed">
          <p>Version {APP_VERSION}</p>
          <p>Build {BUILD_DATE}</p>
        </div>
      </div>
    </aside>
  );
}
