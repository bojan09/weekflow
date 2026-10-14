"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Task } from "@/domain/tasks";
import {
  computeMove,
  computeResize,
  pointToCell,
  type GridMetrics,
} from "./geometry";

export interface DragPreview {
  dayIndex: number;
  startMin: number;
  durationMin: number;
}

export interface DragState {
  taskId: string;
  mode: "move" | "resize";
  /** Where the block would land if released now. Null when outside the grid. */
  preview: DragPreview | null;
}

interface Options {
  /** Current grid geometry, read fresh on every pointer move (it changes on scroll). */
  getMetrics: () => GridMetrics | null;
  /** The scrolling element that clips the grid, for edge auto-scroll. */
  getScroller: () => HTMLElement | null;
  onMove: (taskId: string, dayIndex: number, startMin: number) => void;
  onResize: (taskId: string, durationMin: number) => void;
  /** A press-and-release without dragging. */
  onClick: (taskId: string) => void;
}

const DRAG_THRESHOLD_PX = 5;
const EDGE_PX = 36;
const SCROLL_STEP_PX = 14;

interface Session {
  task: Task;
  mode: "move" | "resize";
  /** Minutes between the block top and the pointer at grab time. */
  grabOffsetMin: number;
  startX: number;
  startY: number;
  active: boolean;
  x: number;
  y: number;
}

/**
 * Pointer-driven drag and resize for calendar blocks, and for tasks dragged in
 * from the unscheduled tray. Mouse, pen and touch all go through pointer events.
 * Escape cancels. Edges auto-scroll.
 */
export function useCalendarDnd(options: Options) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const [drag, setDrag] = useState<DragState | null>(null);
  const session = useRef<Session | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const compute = useCallback((s: Session): DragPreview | null => {
    const { getMetrics, getScroller } = optionsRef.current;
    const metrics = getMetrics();
    const scroller = getScroller();
    if (!metrics || !scroller) return null;
    const rect = scroller.getBoundingClientRect();
    const inside =
      s.x >= metrics.left &&
      s.x <= metrics.left + metrics.width &&
      s.y >= rect.top &&
      s.y <= rect.bottom;
    if (!inside) return null;
    const cell = pointToCell(s.x, s.y, metrics);
    if (s.mode === "resize") {
      const start = s.task.placement?.startMin ?? 0;
      return {
        dayIndex: cell.dayIndex,
        startMin: start,
        // grabOffsetMin = how far past the bottom edge the pointer grabbed, so the edge follows the pointer.
        durationMin: computeResize(cell.minutes - s.grabOffsetMin, start),
      };
    }
    const move = computeMove(cell, s.grabOffsetMin, s.task.durationMin);
    return { ...move, durationMin: s.task.durationMin };
  }, []);

  const finish = useCallback(
    (commit: boolean) => {
      const s = session.current;
      cleanup.current?.();
      cleanup.current = null;
      session.current = null;
      setDrag(null);
      if (!s) return;
      const { onMove, onResize, onClick } = optionsRef.current;
      if (!s.active) {
        if (commit) onClick(s.task.id);
        return;
      }
      if (!commit) return;
      const preview = compute(s);
      if (!preview) return;
      if (s.mode === "resize") {
        if (preview.durationMin !== s.task.durationMin) onResize(s.task.id, preview.durationMin);
      } else {
        onMove(s.task.id, preview.dayIndex, preview.startMin);
      }
    },
    [compute],
  );

  const begin = useCallback(
    (event: PointerEvent<HTMLElement>, task: Task, mode: "move" | "resize", grabOffsetMin: number) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.stopPropagation();
      let offset = grabOffsetMin;
      if (mode === "resize") {
        const metrics = optionsRef.current.getMetrics();
        if (metrics) {
          const cell = pointToCell(event.clientX, event.clientY, metrics);
          offset = cell.minutes - ((task.placement?.startMin ?? 0) + task.durationMin);
        }
      }
      const s: Session = {
        task,
        mode,
        grabOffsetMin: offset,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        x: event.clientX,
        y: event.clientY,
      };
      session.current = s;

      const refresh = (): void => {
        const current = session.current;
        if (!current?.active) return;
        setDrag({ taskId: current.task.id, mode: current.mode, preview: compute(current) });
      };

      const onMoveEvent = (e: globalThis.PointerEvent): void => {
        s.x = e.clientX;
        s.y = e.clientY;
        if (!s.active) {
          // Locked blocks open on click but never drag.
          if (s.task.locked) return;
          if (Math.hypot(s.x - s.startX, s.y - s.startY) < DRAG_THRESHOLD_PX) return;
          s.active = true;
          document.body.style.userSelect = "none";
        }
        refresh();
      };
      const onUp = (): void => finish(true);
      const onCancel = (): void => finish(false);
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === "Escape") finish(false);
      };

      // Auto-scroll while the pointer rests near the top or bottom edge.
      const timer = window.setInterval(() => {
        if (!s.active) return;
        const scroller = optionsRef.current.getScroller();
        if (!scroller) return;
        const rect = scroller.getBoundingClientRect();
        if (s.y < rect.top + EDGE_PX) scroller.scrollTop -= SCROLL_STEP_PX;
        else if (s.y > rect.bottom - EDGE_PX) scroller.scrollTop += SCROLL_STEP_PX;
        else return;
        refresh();
      }, 16);

      window.addEventListener("pointermove", onMoveEvent);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
      cleanup.current = () => {
        window.removeEventListener("pointermove", onMoveEvent);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey);
        window.clearInterval(timer);
        document.body.style.userSelect = "";
      };
    },
    [compute, finish],
  );

  useEffect(
    () => () => {
      cleanup.current?.();
    },
    [],
  );

  /** Start moving a block. `grabOffsetMin` is how far below its top the pointer is. */
  const beginMove = useCallback(
    (event: PointerEvent<HTMLElement>, task: Task, grabOffsetMin: number) =>
      begin(event, task, "move", grabOffsetMin),
    [begin],
  );

  const beginResize = useCallback(
    (event: PointerEvent<HTMLElement>, task: Task) => begin(event, task, "resize", 0),
    [begin],
  );

  return { drag, beginMove, beginResize };
}
