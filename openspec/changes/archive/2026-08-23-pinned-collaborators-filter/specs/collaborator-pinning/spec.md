## ADDED Requirements

### Requirement: Pinned Collaborators Filter Selection
The filter component SHALL provide a dedicated selector allowing users to pin one or multiple employees outside active filter criteria.

#### Scenario: User selects employees in the pinned dropdown
- **WHEN** the user opens the pinned collaborators dropdown and checks one or more employees
- **THEN** the selected employee IDs are added to `pinnedEmployees` in `FilterState` and emitted via `filterChange`.

#### Scenario: User clears pinned employees
- **WHEN** the user clicks the clear button within the pinned dropdown or clicks a pinned employee badge close button
- **THEN** the corresponding employee ID or all pinned employee IDs are removed from `pinnedEmployees` and `filterChange` is emitted.

### Requirement: Additive Inclusion in Planning Views
Planning views (Monthly View, Annual View, Dashboard, Employee List) SHALL display all employees that match the active filter criteria OR are included in the `pinnedEmployees` list, provided they match active-period criteria (if enabled) and the global text search query (if present).

#### Scenario: Employee outside active team filter is pinned
- **WHEN** a team filter is active (e.g. "Dev Front") and an employee from another team (e.g. "Dev Back") is present in `pinnedEmployees`
- **THEN** the pinned employee is included in the rendered planning list alongside the "Dev Front" team members.

#### Scenario: Text search is applied with pinned employees
- **WHEN** an employee is pinned but their name/company does not match the active search input query
- **THEN** the pinned employee is excluded from the view until the search input is cleared or matches their name/company.

### Requirement: Visual Indicator for Pinned Employees
The system SHALL visually distinguish employees that are rendered solely because they are pinned and do not match the standard active filter criteria.

#### Scenario: Pinned employee does not match active filter
- **WHEN** a displayed employee is in `pinnedEmployees` and does not meet the active service/team/site/contract/profile filter criteria
- **THEN** a pin icon (📌) and a "Hors filtre" indicator badge are displayed on the employee's row in the table, without inline deletion button in the table.

#### Scenario: Pinned employee matches active filter
- **WHEN** a displayed employee is in `pinnedEmployees` and also meets the active filter criteria (e.g. filter changed to their team)
- **THEN** the employee is displayed normally without the "Hors filtre" exception indicator.

### Requirement: Integration with Availability and Summary Metrics
The system SHALL include all displayed employees (both standard matches and pinned employees) in the weekly profile availability calculations and summary metric rows.

#### Scenario: Pinned employee affects profile weekly availability
- **WHEN** an extra collaborator is pinned and displayed in the monthly view
- **THEN** their profile and absence days are aggregated into the `profileWeeklyAvailability` breakdown and total employee counts for the displayed month.

### Requirement: LocalStorage Persistence
The filter state containing `pinnedEmployees` SHALL be persisted to `localStorage` per view alongside the rest of the filter settings.

#### Scenario: Page reload with pinned employees
- **WHEN** the user reloads the page or navigates away and returns to the monthly view
- **THEN** the previously pinned employees are restored from `localStorage` and displayed in the view and filter chips.
