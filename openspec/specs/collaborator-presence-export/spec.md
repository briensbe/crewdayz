# collaborator-presence-export Specification

## Purpose
Allows exporting a detailed Excel workbook (`.xlsx`) summarizing the presence, absences, worked days, and public holidays for a specific collaborator over a designated month from the monthly view.

## Requirements

### Requirement: Individual collaborator monthly presence XLSX export
The system SHALL allow exporting a detailed Excel workbook (`.xlsx`) summarizing the presence, absences, worked days, and public holidays for a specific collaborator over a designated month from the monthly view.

#### Scenario: Exporting currently viewed month from monthly view
- **WHEN** the user triggers the export action for a collaborator from the monthly view for the current active view month
- **THEN** the system generates the `.xlsx` workbook corresponding to that specific month and year with all scheduled absences and worked day calculations.

### Requirement: Daily breakdown calculation and formatting
The generated export SHALL include every calendar day of the selected month with its calculated status.

#### Scenario: Working days and weekend/holiday handling
- **WHEN** a day in the month is a Saturday or Sunday
- **THEN** the day is marked as weekend and excluded from worked/working days count.
- **WHEN** a day in the month is a public holiday
- **THEN** the day is marked as public holiday with its official name, and excluded from worked days.
- **WHEN** a day is a regular working day without absence
- **THEN** the day is counted as 1.0 worked day with "Présent / Travaillé" status.
- **WHEN** a day has a full-day absence
- **THEN** the day has 0.0 worked day and displays the absence category and comments.
- **WHEN** a day has a half-day absence (morning or afternoon)
- **THEN** the day counts as 0.5 worked day and 0.5 absence day with the specific category indicated.

### Requirement: Summary metrics calculation
The export SHALL display a summary block summarizing total working days (jours ouvrés), total worked days (jours travaillés), and a detailed breakdown of absence days grouped by category (CP, RTT, Maladie, Temps partiel, etc.).

#### Scenario: Calculation of monthly totals
- **WHEN** the workbook is generated
- **THEN** the summary table computes exact totals matching the daily breakdown and the active rules of Crewdayz.

### Requirement: UI Access Points
The system SHALL provide an intuitive UI action button in monthly view to trigger collaborator export.

#### Scenario: Action in monthly view row
- **WHEN** viewing the monthly calendar table
- **THEN** each collaborator row provides an export icon/button allowing quick export of their monthly summary.
