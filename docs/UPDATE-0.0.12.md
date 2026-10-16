# Planner and mobile update — 2026-10-16

## Behavior

- My Week opens the current Monday–Sunday range on entry. Previous/next navigation still works within the page. The month calendar retains its separate week-start preference.
- Opening the time grid focuses the current unfinished task, otherwise the next timed task in the visible dates, otherwise the current time or working-hours fallback. Editing and minute ticks do not steal scroll.
- Time increments (5, 10, 15, 30 minutes) persist with calendar preferences and apply to dragging, keyboard moves, resizing and editor adjustment buttons. End time, duration and the calendar rectangle share the same task duration.
- Unsaved editor timing is a temporary calendar preview. Save writes through the existing collection; Cancel or Close clears it. Less-used fields are grouped under More options.
- Calendar task blocks offer a trash action on hover/focus and on phones when the block has enough height. Delete also works on a focused block; short blocks retain Delete in the editor. Removal uses the existing Undo action.
- Sidebar choices: Navy, Light, Accent and Match theme. Alternate choices use opaque surfaces so contrast is independent of the page background; Navy retains solved glass transparency. Mobile navigation uses the same tokens.
- Mobile Home has a compact header, one day selector, a small workload strip and five bottom tabs. Team and Review are available under More. Page help is also available from the avatar menu. Account save status remains visible; mobile sign-out is in the avatar menu and Profile.
- Profile supports previewing, replacing and removing a photo before Save. JPG/PNG/WebP uploads are decoded locally, center-cropped to 256px, and re-encoded as a bounded JPEG without original metadata. The existing private profile document stores the image; no public bucket or schema migration is needed. Existing profiles remain compatible.
- Pointer cursors cover links, buttons, menus and selectors. Drag/resize handles retain their action-specific cursors; disabled controls remain distinct. Google buttons use the recognizable multicolor mark and clearer hover/focus feedback.

## Verification

Final checks passed: 437 tests in 54 files, TypeScript, lint and the 0.0.12 production build. Generated theme checks cover all 15 palettes, both schemes, existing glass/background combinations and the new sidebar text pairs (2,456 checks).

Browser checks covered editor timing preview and Cancel restoration; a real grip resize; keyboard resize followed by opening the editor; 5-minute adjustments; phone editor width; light/dark and alternate sidebar colors; mobile Home; quick delete and Undo; and avatar upload, Save, reload and removal using a generated test image.

The live account verifier also confirmed private avatar persistence and rejection of arbitrary image URLs, alongside existing isolation, stale-save, recovery and deletion checks. Only disposable test identities were used and cleaned up. Actual inbox delivery and completed Google sign-in remain separate 0.1.0 release checks.
