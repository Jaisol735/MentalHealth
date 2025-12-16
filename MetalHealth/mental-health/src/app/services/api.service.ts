import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpEvent,
  HttpResponse
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, retry } from "rxjs/operators";
import { AuthService } from "./auth.service";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private apiUrl = "http://localhost:3000/api";

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // 🟢 Generic GET request
  // This will infer Observable<T> by default,
  // but if you pass {observe:'events'} or 'response', TS will infer accordingly.
  get<T>(endpoint: string, options: any = {}): Observable<T | HttpEvent<T> | HttpResponse<T>> {
    return this.http
      .get<T>(`${this.apiUrl}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options,
      })
      .pipe(retry(1), catchError(this.handleError.bind(this)));
  }

  // 🟢 Generic POST request
  post<T>(endpoint: string, data: any, options: any = {}): Observable<T | HttpEvent<T> | HttpResponse<T>> {
    return this.http
      .post<T>(`${this.apiUrl}${endpoint}`, data, {
        headers: this.getAuthHeaders(),
        ...options,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // 🟢 Generic PUT request
  put<T>(endpoint: string, data: any, options: any = {}): Observable<T | HttpEvent<T> | HttpResponse<T>> {
    return this.http
      .put<T>(`${this.apiUrl}${endpoint}`, data, {
        headers: this.getAuthHeaders(),
        ...options,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // 🟢 Generic DELETE request
  delete<T>(endpoint: string, options: any = {}): Observable<T | HttpEvent<T> | HttpResponse<T>> {
    return this.http
      .delete<T>(`${this.apiUrl}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // Auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  // Error handler
  private handleError(error: HttpErrorResponse) {
    let errorMessage = "An unknown error occurred";

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || "Bad Request";
          break;
        case 401:
          errorMessage = "Unauthorized - Please login again";
          this.authService.logout();
          break;
        case 403:
          errorMessage = "Forbidden - Access denied";
          break;
        case 404:
          errorMessage = "Resource not found";
          break;
        case 409:
          errorMessage = error.error?.message || "Conflict - Resource already exists";
          break;
        case 500:
          errorMessage = "Internal server error - Please try again later";
          break;
        default:
          errorMessage = error.error?.message || `Server Error: ${error.status}`;
      }
    }

    console.error("API Error:", error);
    return throwError(() => new Error(errorMessage));
  }
}
