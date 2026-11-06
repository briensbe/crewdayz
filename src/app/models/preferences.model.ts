import { ThemePreference } from '../services/theme.service';

export interface UserPreferences {
  theme?: ThemePreference;
  columnWidths?: {
    annualNameCol?: number;
    monthlyNameCol?: number;
    employeeNameCol?: number;
    [key: string]: number | undefined;
  };
  releaseNotes?: {
    lastSeenVersion?: string;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  columnWidths: {},
  releaseNotes: {},
};
