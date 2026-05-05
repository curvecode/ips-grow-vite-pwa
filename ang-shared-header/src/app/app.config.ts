import {
  ApplicationConfig,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from '../shared/interceptor/token.interceptor';
import { AuthService } from '../core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppInitializer(() => inject(AuthService).initialize()),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideEnvironmentInitializer(() => {
      console.log('Environment initializer called');
    }),
    provideRouter(routes),
  ],
};
