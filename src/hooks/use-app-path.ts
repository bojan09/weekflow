"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { appPath, baseOfPath, type AppRoute } from "@/lib/routes";

/**
 * Builds paths inside the half of the site you are in: /demo links stay in the
 * demo and /app links stay in your account. Use this in place of `appPath`
 * anywhere inside the app shell.
 */
export function useAppPath(): (route: AppRoute, sub?: string) => string {
  const base = baseOfPath(usePathname());
  return useCallback((route: AppRoute, sub?: string) => appPath(route, sub, base), [base]);
}
