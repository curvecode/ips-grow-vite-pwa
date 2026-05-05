import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-lg p-6">
        <h1 class="text-2xl font-semibold text-slate-900 mb-6">Sign in</h1>

        <form class="space-y-4" (ngSubmit)="submit()">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <div
            *ngIf="error"
            class="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            class="w-full rounded-xl bg-blue-600 px-4 py-3 text-white transition hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  submit(): void {
    this.error = '';
    this.authService
      .login({ email: this.email, password: this.password })
      .subscribe({
        next: () => this.router.navigate(['/home']),
        error: (err) => {
          this.error =
            err?.error?.message ||
            err?.message ||
            'Login failed. Please try again.';
        },
      });
  }
}
