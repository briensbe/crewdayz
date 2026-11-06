import { ThemePreference } from '../services/theme.service';

export type ScreenId = 'monthly' | 'annual' | 'employeeList';

export interface ScreenPreferences {
  nameDisplayFormat?: 'last_first' | 'first_last';
  showExtraColumns?: boolean;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

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
  screens?: {
    monthly?: ScreenPreferences;
    annual?: ScreenPreferences;
    employeeList?: ScreenPreferences;
    [key: string]: ScreenPreferences | undefined;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  columnWidths: {},
  releaseNotes: {},
  screens: {},
};
