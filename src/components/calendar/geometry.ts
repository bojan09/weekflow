import { MINUTES_PER_DAY } from "@/domain/tasks";
import { clampDuration, clampStart } from "@/domain/task-ops";

/** Drag and resize snap to this many minutes. */
export const SNAP_MIN = 15;
/** Shortest block a resize can produce. */
export const MIN_BLOCK_MIN = 15;

export const HOUR_HEIGHT: Record<"comfortable" | "compact", number> = {
  comfortable: 56,
  compact: 44,
};

export const snapMinutes = (minutes: number, step: number = SNAP_MIN): number =>
  Math.round(minutes / step) * step;

export const minutesToPx = (minutes: number, hourHeight: number): number => (minutes / 60) * hourHeight;

export const pxToMinutes = (px: number, hourHeight: number): number => (px / hourHeight) * 60;

/** Position of the day columns inside the scrollable grid body, in viewport pixels. */
export interface GridMetrics {
  /** Left edge of the first day column. */
  left: number;
  /** Top edge of the body (moves with scroll). */
  top: number;
  /** Width of all day columns together. */
  width: number;
  dayCount: number;
  hourHeight: number;
}

export interface Cell {
  dayIndex: number;
  /** Raw (unsnapped) minutes since midnight under the pointer. */
  minutes: number;
}

/** Which day column and minute a viewport point is over. Clamped to the grid. */
export function pointToCell(x: number, y: number, grid: GridMetrics): Cell {
  const colWidth = grid.width / grid.dayCount;
  const dayIndex = Math.min(grid.dayCount - 1, Math.max(0, Math.floor((x - grid.left) / colWidth)));
  const minutes = Math.min(MINUTES_PER_DAY, Math.max(0, pxToMinutes(y - grid.top, grid.hourHeight)));
  return { dayIndex, minutes };
}

export interface MovePreview {
  dayIndex: number;
  startMin: number;
}

/**
 * Where a dragged block lands. `grabOffsetMin` is how far below the block's top
 * the pointer grabbed it, so the block does not jump to the cursor.
 */
export function computeMove(
  cell: Cell,
  grabOffsetMin: number,
  durationMin: number,
  step: number = SNAP_MIN,
): MovePreview {
  const startMin = clampStart(snapMinutes(cell.minutes - grabOffsetMin, step), durationMin);
  return { dayIndex: cell.dayIndex, startMin };
}

/** New duration when the bottom edge is dragged to `pointerMin`. */
export function computeResize(pointerMin: number, startMin: number, step: number = SNAP_MIN): number {
  const raw = Math.max(step, snapMinutes(pointerMin - startMin, step));
  return Math.min(clampDuration(raw), MINUTES_PER_DAY - startMin);
}

export interface LayoutItem {
  id: string;
  start: number;
  end: number;
}

export interface LaneInfo {
  lane: number;
  lanes: number;
}

/**
 * Side-by-side lanes for overlapping blocks in one day. Items that overlap
 * (directly or through a chain) share a cluster and split the width equally.
 */
export function layoutDay(items: readonly LayoutItem[]): Map<string, LaneInfo> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : 1));
  const result = new Map<string, LaneInfo>();

  let cluster: LayoutItem[] = [];
  let clusterEnd = -1;

  const flush = (): void => {
    const laneEnds: number[] = [];
    const assigned: Array<{ id: string; lane: number }> = [];
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      assigned.push({ id: item.id, lane });
    }
    for (const { id, lane } of assigned) result.set(id, { lane, lanes: laneEnds.length });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) flush();
  return result;
}
