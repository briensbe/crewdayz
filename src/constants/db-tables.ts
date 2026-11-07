const DB_PREFIX = 'cd_'; //cd pour CrewDayz

export const DB_TABLES = {
  ABSENCES: `${DB_PREFIX}absences`,
  EMPLOYEES: `${DB_PREFIX}employees`,
  EMPLOYEE_BALANCES: `${DB_PREFIX}employee_balances`,
  USER_PREFERENCES: `${DB_PREFIX}user_preferences`,
  USER_PROFILES: `${DB_PREFIX}user_profiles`,
  AUDIT_LOGS: 'audit_logs',
} as const;

export const DB_RPC = {
  GET_TEAMS_DISCOVERY: `${DB_PREFIX}get_teams_discovery`,
  GET_AVAILABILITIES: `${DB_PREFIX}get_availabilities`,
} as const;
