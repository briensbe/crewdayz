import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SupabaseService } from "../services/supabase.service";
import { environment } from "../../environments/environment.prod";

export const AuthGuard: CanActivateFn = async (route, state) => {
  // If authentication is disabled for development, allow access
  if (!environment.enableAuth) {
    return true;
  }

  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // 1. Check user cache signal first (instant)
  const user = supabaseService.user();
  if (user) return true;

  // 2. Fetch session from Supabase (network/local storage check)
  const { data } = await supabaseService.getUser();

  if (!data?.user) {
    // Redirect to login page and keep track of return URL
    router.navigate(["/login"], { queryParams: { returnUrl: state.url } });
    return false;
  }
  return true;
};
