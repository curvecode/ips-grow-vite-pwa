import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('../features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('../features/home/home/home.component').then(
        (m) => m.HomeComponent,
      ),
    canActivate: [authGuard],
  },
];
