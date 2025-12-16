import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import {  Observable, BehaviorSubject, tap } from "rxjs"
import  { Router } from "@angular/router"

export interface User {
  id: number
  name: string
  email: string
  phoneno: string
  age: number
  gender: string
  instagram_token?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  name: string
  email: string
  phoneno: string
  age: number
  gender: string
  password: string
  instagram_token?: string
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "http://localhost:3000/api"
  private currentUserSubject = new BehaviorSubject<User | null>(null)
  public currentUser$ = this.currentUserSubject.asObservable()

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // Check if user is already logged in on service initialization
    this.checkAuthStatus()
  }

  private checkAuthStatus(): void {
    const token = this.getToken()
    if (token) {
      this.verifyToken().subscribe({
        next: (response) => {
          this.currentUserSubject.next(response.user)
        },
        error: () => {
          this.logout()
        },
      })
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        this.setToken(response.token)
        this.currentUserSubject.next(response.user)
      }),
    )
  }

  signup(userData: SignupRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/signup`, userData).pipe(
      tap((response) => {
        this.setToken(response.token)
        this.currentUserSubject.next(response.user)
      }),
    )
  }

  logout(): void {
    const token = this.getToken()
    if (token) {
      this.http
        .post(
          `${this.apiUrl}/auth/logout`,
          {},
          {
            headers: this.getAuthHeaders(),
          },
        )
        .subscribe({
          complete: () => {
            this.clearAuthData()
          },
          error: () => {
            this.clearAuthData()
          },
        })
    } else {
      this.clearAuthData()
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem("auth_token")
    this.currentUserSubject.next(null)
    this.router.navigate(["/"])
  }

  verifyToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/verify`, {
      headers: this.getAuthHeaders(),
    })
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/profile`, {
      headers: this.getAuthHeaders(),
    })
  }

  updateProfile(userId: number, userData: Partial<User>): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}`, userData, {
      headers: this.getAuthHeaders(),
    })
  }

  isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch {
      return false
    }
  }

  getToken(): string | null {
    return localStorage.getItem("auth_token")
  }

  private setToken(token: string): void {
    localStorage.setItem("auth_token", token)
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken()
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    })
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value
  }

  // Update the current user in the subject
  updateCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user)
  }
}
