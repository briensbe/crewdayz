export interface EmployeeBalance {
  id?: string;
  employee_id: string;
  year: number;
  initial_cp: number;
  initial_rtt: number;
  initial_exceptional: number;
  created_at?: string;
  updated_at?: string;
}

export const CONTRACT_DEFAULT_BALANCES = {
  Interne: {
    initial_cp: 25.0,
    initial_rtt: 20.0,
    initial_exceptional: 0.0,
  },
  Externe: {
    initial_cp: 25.0,
    initial_rtt: 10.0,
    initial_exceptional: 0.0,
  },
};

export interface Employee {
  id?: string;
  first_name: string;
  last_name: string;
  service: string;
  team: string; // Called "Ilot" in French UI
  work_site: string;
  contract_type: 'Interne' | 'Externe';
  company_name?: string;
  profile: string;
  arrival_date?: string;
  departure_date?: string;
  created_at?: string;
  updated_at?: string;

  // App-populated balances for active year view
  initial_cp?: number;
  initial_rtt?: number;
  initial_exceptional?: number;

  cd_employee_balances?: EmployeeBalance[];
}

export interface Absence {
  id?: string;
  employee_id: string;
  date: string; // YYYY-MM-DD format
  period: 'full' | 'morning' | 'afternoon';
  category: 'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre' | 'Temps partiel' | 'Prévisionnel';
  comment?: string;
  created_at?: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata: {
    displayName?: string;
  };
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SchoolHolidayPeriod {
  name: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  zones: string[];
}

export interface SchoolHolidaysConfig {
  holidays: SchoolHolidayPeriod[];
  siteAssociations: {
    [siteLabel: string]: string;
  };
}

export interface AuditLog {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  row_id: string;
  old_data: any;
  new_data: any;
  changed_by: string | null;
  changed_at: string;
  profiles?: {
    full_name: string;
  } | null;
}


