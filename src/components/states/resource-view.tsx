import type { ReactNode } from "react";
import type { ResourceState } from "@/data/use-collection";
import { ErrorState, PermissionDenied } from "./states";

/** Renders the right screen for each resource state so no page forgets one. */
export function ResourceView<T>({
  state,
  loading,
  children,
}: {
  state: ResourceState<T>;
  loading: ReactNode;
  children: (data: T) => ReactNode;
}) {
  switch (state.status) {
    case "loading":
      return loading;
    case "error":
      return <ErrorState message={state.message} onRetry={state.retry} />;
    case "denied":
      return <PermissionDenied />;
    case "ready":
      return children(state.data);
  }
}
