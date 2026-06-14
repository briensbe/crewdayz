import { Injectable, signal } from "@angular/core";
import { AuthTokenResponse, createClient, SupabaseClient, UserResponse, User } from "@supabase/supabase-js";
import { BehaviorSubject } from "rxjs";
import { LoginPayload, SignupPayload } from "../models/types";
import { environment } from "../../environments/environment";

const sessionStorageUserKey = "crewdayzUser";

@Injectable({
  providedIn: "root"
})
export class SupabaseService {
  private supabase: SupabaseClient<any, any>;
  private _user = signal<User | null>(null);
  private _isLocalLogout = false;

  /**
   * Observable to track auth state changes (for backward compatibility / navigation guards)
   */
  readonly authState$ = new BehaviorSubject<{ event: string, session: any } | null>(null);

  /**
   * Reactive signal for currently logged in user
   */
  public user = this._user.asReadonly();

  /**
   * Flag indicating if the user manually logged out from this browser tab
   */
  get isLocalLogout() {
    return this._isLocalLogout;
  }

  constructor() {
    // We configure the DB client to use the standard "public" schema
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      db: {
        schema: "crewdayz"
      },
      auth: {
        lock: (name, acquireTimeout, acquireFn) => this.safeLock(name, acquireFn),
      },
    });

    this.initializeAuthListener();
    
    // Initial session load to populate user signal immediately
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this._user.set(session.user);
      }
    });
  }

  private async safeLock<T>(name: string, acquireFn: () => Promise<T>, retries = 5, delayMs = 50): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await navigator.locks.request(name, { ifAvailable: true }, acquireFn);
        if (result !== undefined) return result;
      } catch {
        // Ignore and retry
      }
      await new Promise(res => setTimeout(res, delayMs));
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
  async getUser(): Promise<{ data: { user: User | null }, error: any }> {
    const cachedUser = this._user();
    if (cachedUser) {
      return { data: { user: cachedUser }, error: null };
    }

    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
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
   * Log out the current user
   */
  async signOut() {
    this._isLocalLogout = true;
    this._user.set(null);
    this.authState$.next(null);

    try {
      await this.supabase.auth.signOut();
    } finally {
      sessionStorage.removeItem(sessionStorageUserKey);
      setTimeout(() => this._isLocalLogout = false, 1000);
    }
  }

  /**
   * Send a password reset email
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    try {
      const authRedirectUrl = environment.authRedirectUrl;
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl + "/update-password",
      });

      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || "Erreur lors de l’envoi du mail de réinitialisation.");
    }
  }

  /**
   * Exchange the recovery/invite token for a session
   */
  async exchangeCodeForSession(hash: string): Promise<AuthTokenResponse> {
    if (!hash.includes("access_token")) throw new Error("Token manquant");
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
    return response;
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  private initializeAuthListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.authState$.next({ event, session });
      this._user.set(session?.user ?? null);

      if (session?.user) {
        sessionStorage.setItem(sessionStorageUserKey, JSON.stringify(session.user));
      } else {
        sessionStorage.removeItem(sessionStorageUserKey);
      }
    });
  }

  /**
   * Google OAuth Sign-in
   */
  async signInWithGoogle() {
    return await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: environment.authRedirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }
}
