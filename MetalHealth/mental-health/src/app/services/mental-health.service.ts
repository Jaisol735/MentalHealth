import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface MentalHealthAnswers {
  // Core Daily Metrics
  mood: string;
  moodLevel: number;
  stressLevel: number;
  sleepHours: number;
  sleepQuality: string;
  anxietyFrequency: string;
  energyLevel: string;
  overwhelmedFrequency: string;
  socialConnection: string;
  dailyFunctioning: string;
  
  // Optional fields for backward compatibility
  wantsSummary?: boolean | string;
  todaySummary?: string;
  wantsInstagramAnalysis?: boolean | string;
  instagramAnalysis?: string;
  commonFeeling?: string;
  [key: string]: any; // Allow string indexing
}

export interface AIAnalysis {
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendations: string | string[];
  timestamp: string;
}

export interface Assessment {
  id: string;
  answers: MentalHealthAnswers;
  aiAnalysis?: AIAnalysis;
  createdAt: string;
}

export interface AssessmentResponse {
  message: string;
  assessment: Assessment;
}

export interface HistoryResponse {
  message: string;
  assessments: Assessment[];
}

export interface DailySummary {
  id?: string;
  date: string;
  summary: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailySummaryResponse {
  message: string;
  summary?: DailySummary;
  summaries?: DailySummary[];
}

export interface HealthAnalytics {
  summary: string;
  trends: string;
  insights: string;
  recommendations: string | string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  moodTrend: string;
  stressTrend: string;
  sleepTrend: string;
  energyTrend: string;
  timestamp: string;
}

export interface WeeklyAnalyticsResponse {
  message: string;
  weekStart: string;
  weekEnd: string;
  assessments: Assessment[];
  summaries: DailySummary[];
  analytics: HealthAnalytics;
}

export interface MonthlyAnalyticsResponse {
  message: string;
  month: number;
  year: number;
  monthStart: string;
  monthEnd: string;
  assessments: Assessment[];
  summaries: DailySummary[];
  analytics: HealthAnalytics;
}

@Injectable({
  providedIn: 'root'
})
export class MentalHealthService {
  private apiUrl = 'http://localhost:3000/api/mentalhealth';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  submitAssessment(answers: MentalHealthAnswers): Observable<AssessmentResponse> {
    return this.http.post<AssessmentResponse>(
      `${this.apiUrl}/assessment`,
      { answers },
      { headers: this.getHeaders() }
    );
  }

  getAssessmentHistory(): Observable<HistoryResponse> {
    return this.http.get<HistoryResponse>(
      `${this.apiUrl}/history`,
      { headers: this.getHeaders() }
    );
  }

  getLatestAssessment(): Observable<AssessmentResponse> {
    return this.http.get<AssessmentResponse>(
      `${this.apiUrl}/latest`,
      { headers: this.getHeaders() }
    );
  }

  getAssessmentByDate(date: string): Observable<{assessment: Assessment | null}> {
    return this.http.get<{assessment: Assessment | null}>(
      `${this.apiUrl}/date/${date}`,
      { headers: this.getHeaders() }
    );
  }

  downloadReport(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download-report`, {
      responseType: 'blob',
      headers: this.getHeaders()
    });
  }

  // Daily Summary methods
  saveDailySummary(summary: string, isSynthetic: boolean = false): Observable<DailySummaryResponse> {
    return this.http.post<DailySummaryResponse>(
      `${this.apiUrl}/daily-summary`,
      { summary, isSynthetic },
      { headers: this.getHeaders() }
    );
  }

  getDailySummaries(): Observable<DailySummaryResponse> {
    return this.http.get<DailySummaryResponse>(
      `${this.apiUrl}/daily-summary`,
      { headers: this.getHeaders() }
    );
  }

  getTodaysSummary(): Observable<DailySummaryResponse> {
    return this.http.get<DailySummaryResponse>(
      `${this.apiUrl}/daily-summary/today`,
      { headers: this.getHeaders() }
    );
  }

  updateDailySummary(id: string, summary: string): Observable<DailySummaryResponse> {
    return this.http.put<DailySummaryResponse>(
      `${this.apiUrl}/daily-summary/${id}`,
      { summary },
      { headers: this.getHeaders() }
    );
  }

  // Health Analytics methods
  getWeeklyAnalytics(weekStart?: string): Observable<WeeklyAnalyticsResponse> {
    let params = new HttpParams();
    if (weekStart) {
      params = params.set('weekStart', weekStart);
    }
    
    return this.http.get<WeeklyAnalyticsResponse>(
      `${this.apiUrl}/analytics/weekly`,
      { 
        headers: this.getHeaders(),
        params: params
      }
    );
  }

  getMonthlyAnalytics(month?: number, year?: number): Observable<MonthlyAnalyticsResponse> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month.toString());
    }
    if (year) {
      params = params.set('year', year.toString());
    }
    
    return this.http.get<MonthlyAnalyticsResponse>(
      `${this.apiUrl}/analytics/monthly`,
      { 
        headers: this.getHeaders(),
        params: params
      }
    );
  }
}
