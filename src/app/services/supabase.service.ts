import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse, AuthTokenResponse, createClient, SupabaseClient, UserResponse, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { LoginPayload, SignupPayload, UserProfile, UserRole } from '../models/types';
import { environment } from '../../environments/environment';
import { validateSignupEmail } from '../../utils/email-validator';

const sessionStorageUserKey = 'crewdayzUser';
const sessionStorageProfileKey = 'crewdayzUserProfile';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly router = inject(Router);
  private supabase: SupabaseClient<any, any>;
  private _user = signal<User | null>(null);
  private _userProfile = signal<UserProfile | null>(null);
  private _isPasswordRecovery = signal(false);
  private _isLocalLogout = false;

  /**
   * Observable to track auth state changes (for backward compatibility / navigation guards)
   */
  readonly authState$ = new BehaviorSubject<{ event: string; session: any } | null>(null);

  /**
   * Reactive signal for currently logged in user
   */
  public user = this._user.asReadonly();

  /**
   * Reactive signal indicating if current session was triggered by password recovery
   */
  public isPasswordRecovery = this._isPasswordRecovery.asReadonly();

  /**
   * Reactive signal for current user profile and role
   */
  public userProfile = this._userProfile.asReadonly();

  /**
   * Reactive role of the user (defaults to 'viewer' if not yet loaded or unassigned)
   */
  public userRole = computed<UserRole>(() => this._userProfile()?.role ?? 'viewer');

  /**
   * Reactive flag indicating if the current user has read-only access
   */
  public isReadOnly = computed<boolean>(() => this.userRole() === 'viewer');

  /**
   * Flag indicating if the user manually logged out from this browser tab
   */
  get isLocalLogout() {
    return this._isLocalLogout;
  }

  constructor() {
    // We configure the DB client to use the standard "crewdayz" schema
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      db: {
        schema: 'crewdayz',
      },
      auth: {
        lock: (name, acquireTimeout, acquireFn) => this.safeLock(name, acquireFn),
        flowType: 'pkce',
      },
    });

    this.initializeAuthListener();

    // Handle PKCE code exchange if present in URL, then load initial session
    this.handlePkceCallback().finally(() => {
      // Initial session load to populate user signal immediately
      this.supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          this._user.set(session.user);
          this.fetchUserProfile(session.user.id);
        }
      });
    });
  }

  /**
   * Handle PKCE code exchange from URL query parameters and clean up the URL
   */
  private async handlePkceCallback() {
    if (typeof window !== 'undefined' && window.location) {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        try {
          const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchanging PKCE code for session:', error);
          } else if (data?.session?.user) {
            this._user.set(data.session.user);
          }
        } catch (err) {
          console.error('Unexpected error during PKCE code exchange:', err);
        } finally {
          const isRecoveryUrl =
            url.pathname.includes('reset-password') ||
            url.hash.includes('reset-password') ||
            url.pathname.includes('update-password') ||
            url.hash.includes('update-password');
          // Clean the code parameter from URL
          url.searchParams.delete('code');
          window.history.replaceState({}, document.title, url.toString());

          if (isRecoveryUrl) {
            this._isPasswordRecovery.set(true);
            setTimeout(() => this.router.navigate(['/reset-password']), 50);
          }
        }
      }
    }
  }

  private async safeLock<T>(name: string, acquireFn: () => Promise<T>, retries = 5, delayMs = 50): Promise<T> {
    if (typeof navigator === 'undefined' || !navigator.locks) {
      return acquireFn();
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await navigator.locks.request(name, { ifAvailable: true }, acquireFn);
        if (result !== undefined) return result;
      } catch {
        // Ignore and retry
      }
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return navigator.locks.request(name, acquireFn);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Log in an existing user
   */
  async signInWithEmail(payload: LoginPayload) {
    return await this.supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });
  }

  /**
   * Sign up a new user
   */
  async signUpWithEmail(payload: SignupPayload) {
    const validation = validateSignupEmail(payload.email, environment.allowedEmailDomains);
    if (!validation.isValid) {
      return {
        data: { user: null, session: null },
        error: {
          name: 'AuthApiError',
          message: validation.errorMessage || 'Domaine email non autorisé.',
          status: 400,
        } as any,
      };
    }

    const authRedirectUrl = environment.authRedirectUrl;
    return await this.supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: authRedirectUrl,
        data: {
          displayName: payload.name,
        },
      },
    });
  }

  /**
   * Get the currently logged in user (fast cached signal, falling back to network if needed)
   */
  async getUser(): Promise<{ data: { user: User | null }; error: any }> {
    const cachedUser = this._user();
    if (cachedUser) {
      return { data: { user: cachedUser }, error: null };
    }

    const {
      data: { session },
      error: sessionError,
    } = await this.supabase.auth.getSession();
    if (session?.user) {
      this._user.set(session.user);
      return { data: { user: session.user }, error: null };
    }

    const response = await this.supabase.auth.getUser();
    if (response.data.user) {
      this._user.set(response.data.user);
    }
    return response;
  }

  /**
   * Fetch current user's profile and role from Supabase database
   */
  async fetchUserProfile(userId?: string): Promise<UserProfile | null> {
    const uid = userId || this._user()?.id;
    if (!uid) {
      this._userProfile.set(null);
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('cd_user_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error || !data) {
        // Fallback default profile with 'viewer' role
        const defaultProfile: UserProfile = {
          id: uid,
          email: this._user()?.email,
          role: 'viewer',
        };
        this._userProfile.set(defaultProfile);
        return defaultProfile;
      }

      this._userProfile.set(data as UserProfile);
      return data as UserProfile;
    } catch {
      const fallback: UserProfile = {
        id: uid,
        email: this._user()?.email,
        role: 'viewer',
      };
      this._userProfile.set(fallback);
      return fallback;
    }
  }

  /**
   * Log out the current user
   */
  async signOut() {
    this._isLocalLogout = true;
    this._user.set(null);
    this._userProfile.set(null);
    this._isPasswordRecovery.set(false);
    this.authState$.next(null);

    try {
      await this.supabase.auth.signOut();
    } finally {
      sessionStorage.removeItem(sessionStorageUserKey);
      sessionStorage.removeItem(sessionStorageProfileKey);
      setTimeout(() => (this._isLocalLogout = false), 1000);
    }
  }

  /**
   * Send a password reset email containing an OTP code
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de l’envoi du mail de réinitialisation.');
    }
  }

  /**
   * Verify 6-digit OTP code received by email for password recovery and establish session
   */
  async verifyRecoveryOtp(email: string, token: string): Promise<AuthResponse> {
    const response = await this.supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    });

    if (response.error) {
      throw new Error('Code de confirmation invalide ou expiré.');
    }

    if (response.data?.session?.user) {
      this._user.set(response.data.session.user);
      this._isPasswordRecovery.set(true);
      await this.fetchUserProfile(response.data.session.user.id);
    }

    return response;
  }

  /**
   * Reset user password using a 6-digit OTP code received by email
   */
  async resetPasswordWithOtp(email: string, token: string, newPassword: string): Promise<void> {
    try {
      // 1. Verify OTP code and establish recovery session
      await this.verifyRecoveryOtp(email, token);

      // 2. Update the user password
      const { error: updateError } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      this._isPasswordRecovery.set(false);
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la réinitialisation du mot de passe.');
    }
  }

  /**
   * Exchange the recovery/invite token for a session
   */
  async exchangeCodeForSession(hash: string): Promise<AuthTokenResponse> {
    if (!hash.includes('access_token')) throw new Error('Token manquant');
    const response = await this.supabase.auth.exchangeCodeForSession(hash);
    if (response.error) throw new Error(response.error.message);
    return response;
  }

  /**
   * Update current user's password
   */
  async updatePassword(newPassword: string): Promise<UserResponse> {
    const response = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (response.error) throw new Error(response.error.message);
    this._isPasswordRecovery.set(false);
    return response;
  }

  /**
   * Update current user's display name
   */
  async updateDisplayName(displayName: string): Promise<UserResponse> {
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error('Le nom d’affichage ne peut pas être vide.');
    }
    const response = await this.supabase.auth.updateUser({
      data: {
        displayName: trimmed,
      },
    });
    if (response.error) throw new Error(response.error.message || 'Erreur lors de la mise à jour du nom d’affichage.');
    if (response.data.user) {
      this._user.set(response.data.user);
      sessionStorage.setItem(sessionStorageUserKey, JSON.stringify(response.data.user));
    }
    return response;
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  private initializeAuthListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this._isPasswordRecovery.set(true);
        this.router.navigate(['/reset-password']);
      } else if (event === 'SIGNED_OUT') {
        this._isPasswordRecovery.set(false);
      }

      this.authState$.next({ event, session });
      this._user.set(session?.user ?? null);

      if (session?.user) {
        sessionStorage.setItem(sessionStorageUserKey, JSON.stringify(session.user));
        this.fetchUserProfile(session.user.id);
      } else {
        sessionStorage.removeItem(sessionStorageUserKey);
        sessionStorage.removeItem(sessionStorageProfileKey);
        this._userProfile.set(null);
      }
    });
  }

  /**
   * Google OAuth Sign-in
   */
  async signInWithGoogle() {
    return await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: environment.authRedirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  }
}
