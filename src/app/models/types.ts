export interface Employee {
  id?: string;
  first_name: string;
  last_name: string;
  service: string;
  team: string; // Called "Ilot" in French UI
  work_site: string;
  contract_type: 'Interne' | 'Externe';
  company_name?: string;
  profile: 'Développeur' | 'Business Analyst';
  initial_cp: number;
  initial_rtt: number;
  initial_exceptional: number;
  created_at?: string;
  updated_at?: string;
}

export interface Absence {
  id?: string;
  employee_id: string;
  date: string; // YYYY-MM-DD format
  period: 'full' | 'morning' | 'afternoon';
  category: 'CP' | 'RTT' | 'Maladie' | 'Congé maternité' | 'Exceptionnel' | 'Formation' | 'Autre';
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
