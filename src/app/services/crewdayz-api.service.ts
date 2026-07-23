import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface CrewdayzTeamDiscovery {
  nom: string;
  profils: string[];
}

export interface CrewdayzDiscoveryResponse {
  equipes: CrewdayzTeamDiscovery[];
}

export interface CrewdayzWeekAvailability {
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  membersCount: number;
  capacityDays: number;
  absenceDays: number;
  availableDays: number;
}

export interface CrewdayzProfileAvailability {
  profileId: string;
  profileName: string;
  weeks: CrewdayzWeekAvailability[];
}

export interface CrewdayzTeamAvailability {
  teamId: string;
  teamName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  profiles: CrewdayzProfileAvailability[];
}

@Injectable({
  providedIn: 'root',
})
export class CrewdayzApiService {
  constructor(private supabase: SupabaseService) {}

  /**
   * API Discovery : Expose les couples Équipe + Profils sous forme hiérarchique JSON.
   */
  async getDiscovery(): Promise<CrewdayzDiscoveryResponse> {
    const { data, error } = await this.supabase.client.rpc('cd_get_teams_discovery');
    if (error) {
      console.error('[CrewdayzApiService] Error in cd_get_teams_discovery:', error);
      return { equipes: [] };
    }
    return (data as CrewdayzDiscoveryResponse) || { equipes: [] };
  }

  /**
   * API Availabilities : Renvoie la disponibilité par équipe, profil et semaines pour une plage de dates.
   */
  async getAvailabilities(
    startDate: string,
    endDate: string,
    teamName?: string
  ): Promise<CrewdayzTeamAvailability[]> {
    const { data, error } = await this.supabase.client.rpc('cd_get_availabilities', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_team_name: teamName || null,
    });

    if (error) {
      console.error('[CrewdayzApiService] Error in cd_get_availabilities:', error);
      return [];
    }
    return (data as CrewdayzTeamAvailability[]) || [];
  }
}
