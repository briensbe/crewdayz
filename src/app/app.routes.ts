import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { UpdatePasswordComponent } from './auth/update-password/update-password.component';
import { ProfileComponent } from './auth/profile/profile.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'update-password', component: UpdatePasswordComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent) 
      },
      { 
        path: 'collaborateurs', 
        loadComponent: () => import('./views/employee-list/employee-list.component').then(m => m.EmployeeListComponent) 
      },
      { 
        path: 'mensuel', 
        loadComponent: () => import('./views/monthly-view/monthly-view.component').then(m => m.MonthlyViewComponent) 
      },
      { 
        path: 'annuel', 
        loadComponent: () => import('./views/annual-view/annual-view.component').then(m => m.AnnualViewComponent) 
      },
      { 
        path: 'vacances', 
        loadComponent: () => import('./views/holidays-view/holidays-view.component').then(m => m.HolidaysViewComponent) 
      },
      { path: 'profile', component: ProfileComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
