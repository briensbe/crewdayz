import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { UserRole } from '../models/types';
import { environment } from '../../environments/environment';

/**
 * Functional guard ensuring the user has one of the required roles specified in route data.
 * If unauthorized, redirects Viewers to /mensuel and others to /dashboard.
 */
export const RoleGuard: CanActivateFn = async (route, state): Promise<boolean | UrlTree> => {
  if (!environment.enableAuth) {
    return true;
  }

  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // 1. Ensure user is authenticated
  const user = supabaseService.user() || (await supabaseService.getUser()).data.user;
  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  // 2. Ensure profile with role is loaded
  let profile = supabaseService.userProfile();
  if (!profile) {
    profile = await supabaseService.fetchUserProfile(user.id);
  }

  const currentRole: UserRole = profile?.role ?? 'viewer';
  const allowedRoles = (route.data?.['roles'] as UserRole[]) || ['editor', 'admin'];

  if (allowedRoles.includes(currentRole)) {
    return true;
  }

  // 3. Unauthorized: redirect to appropriate allowed fallback route
  if (currentRole === 'viewer') {
    return router.createUrlTree(['/mensuel']);
  }

  return router.createUrlTree(['/dashboard']);
};

/**
 * Guard for the root route '/' redirecting dynamically based on the user's role.
 */
export const RootRedirectGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  if (!environment.enableAuth) {
    return inject(Router).createUrlTree(['/dashboard']);
  }

  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const user = supabaseService.user() || (await supabaseService.getUser()).data.user;
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  let profile = supabaseService.userProfile();
  if (!profile) {
    profile = await supabaseService.fetchUserProfile(user.id);
  }

  const currentRole: UserRole = profile?.role ?? 'viewer';
  if (currentRole === 'viewer') {
    return router.createUrlTree(['/mensuel']);
  }

  return router.createUrlTree(['/dashboard']);
};
