import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, firstValueFrom, mapTo, of, tap, throwError, Observable } from 'rxjs';

interface AuthResponse {
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private accessToken: string | null = null;
  readonly isAuthenticated$ = new BehaviorSubject<boolean>(false);
  private readonly authBaseUrl = '/auth'; // Update this prefix if your backend uses a different auth path

  constructor(private http: HttpClient) {}

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private setAccessToken(token: string): void {
    this.accessToken = token;
    this.isAuthenticated$.next(true);
  }

  clearToken(): void {
    this.accessToken = null;
    this.isAuthenticated$.next(false);
  }

  login(credentials: { email: string; password: string }): Observable<void> {
    if (credentials.email && credentials.password) {
      // Simulate a successful login
      this.setAccessToken('mock-access-token');
      return of(void 0);
    }

    return of(void 0);
    // return this.http
    //   .post<AuthResponse>(`${this.authBaseUrl}/login`, credentials, { withCredentials: true })
    //   .pipe(
    //     tap((response) => this.setAccessToken(response.accessToken)),
    //     mapTo(void 0)
    //   );
  }

  refresh(): Observable<void> {
    return this.http
      .post<AuthResponse>(`${this.authBaseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.setAccessToken(response.accessToken)),
        mapTo(void 0),
        catchError((error) => {
          this.clearToken();
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.authBaseUrl}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearToken()));
  }

  initialize(): Promise<void> {
    return firstValueFrom(
      this.refresh().pipe(
        mapTo(void 0),
        catchError(() => of(void 0))
      )
    );
  }
}
