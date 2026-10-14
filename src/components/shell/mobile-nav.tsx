"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EXTRA_NAV, PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/nav";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { isActiveRoute } from "./sidebar";

const itemClass = (active: boolean): string =>
  cn(
    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[11px] font-medium whitespace-nowrap transition-colors",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
  );

function MoreLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = isActiveRoute(pathname, item);
  return (
    <Link
      href={appPath(item.route)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
        active ? "bg-primary-soft text-primary-soft-text" : "hover:bg-muted",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const moreOpen = useUiStore((s) => s.moreOpen);
  const setMoreOpen = useUiStore((s) => s.setMoreOpen);
  const tabItems = PRIMARY_NAV.filter((item) => item.tab !== false);
  const moreItems = [...PRIMARY_NAV.filter((item) => item.tab === false), ...SECONDARY_NAV, ...EXTRA_NAV];
  const moreActive = moreItems.some((item) => isActiveRoute(pathname, item));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-2 bottom-3 z-40 surface-sidebar rounded-3xl p-1 shadow-lift lg:hidden"
      >
        <ul className="grid grid-cols-6 gap-0.5">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item);
            return (
              <li key={item.route}>
                <Link
                  href={appPath(item.route)}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active)}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(itemClass(moreActive), "w-full")}
            >
              <Ellipsis className="size-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-6">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <nav aria-label="More" className="flex flex-col gap-1 px-4">
            {moreItems.map((item) => (
              <MoreLink key={item.route} item={item} onNavigate={() => setMoreOpen(false)} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
