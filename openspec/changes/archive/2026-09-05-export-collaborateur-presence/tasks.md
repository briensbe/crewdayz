## 1. Export Service & Workbook Generation

- [x] 1.1 Create `CollaboratorPresenceExportService` in `src/app/services/collaborator-presence-export.service.ts` to compute monthly metrics and generate styled `.xlsx` workbooks.
- [x] 1.2 Implement detailed daily status breakdown (present, weekend, public holiday from `src/utils/holidays.ts`, half-day absence, full-day absence).
- [x] 1.3 Implement summary KPI block with totals (working days, worked days, subtotal absences per category).
- [x] 1.4 Apply professional HR spreadsheet styling using `xlsx-js-style` (headers, borders, color-coded rows/cells).

## 2. Integration in Monthly View

- [x] 2.1 Add an individual export action button/menu in `MonthlyViewComponent` table rows for each collaborator.
- [x] 2.2 Wire the action to export the currently selected month for that collaborator.

## 3. Scope Adjustment & Employee List Cleanup

- [x] 3.1 Remove the individual export button and unused export dependencies from `EmployeeListComponent`.

## 4. Verification & Validation

- [x] 4.1 Test XLSX generation with unit tests.
- [x] 4.2 Verify build (`pnpm run build`) and test suites (`pnpm test`).
