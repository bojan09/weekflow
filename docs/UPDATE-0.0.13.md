# Visible time intervals and direct task actions

Date: 2026-10-16

The calendar's existing 5/10/15/30-minute preference now controls visible labels and gridlines as well as drag snapping. A shared scale keeps rows at least 24px high in comfortable density or 20px in compact density. Both the calendar and pointer calculations use this scale, so task sizes and times remain consistent. Changing spacing preserves the viewed time; first entry still focuses current/upcoming work. Controls are available on Home, My Week and in calendar settings.

Task list rows expose Edit and Delete alongside their overflow menu. Delete uses the existing Undo action. Priority has a full editor row; category/project selectors use the available width.

Initial private data loading renders a neutral planner skeleton without mounting demo or account children prematurely. Only a real load failure displays retry and sign-in recovery controls; save conflicts and export safeguards remain intact.

Verification: 444 tests in 57 files, type checks, lint and production build passed before the version increment. Added tests cover every minute spacing, scroll preservation, direct task actions and the loading skeleton. Desktop and 390px browser checks confirmed readable five-minute labels and no horizontal overflow in the task list. No database migration or new environment settings are needed.
