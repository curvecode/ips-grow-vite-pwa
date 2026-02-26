import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home').then((m) => m.Home),
  },
  {
    path: 'signal-form',
    loadComponent: () => import('./components/signal-form/signal-form').then((m) => m.SignalForm),
  },
];
