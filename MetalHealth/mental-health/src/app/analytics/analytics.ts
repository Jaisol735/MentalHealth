import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { MentalHealthService, HealthAnalytics, WeeklyAnalyticsResponse, MonthlyAnalyticsResponse, Assessment, DailySummary } from '../services/mental-health.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css']
})
export class AnalyticsComponent implements OnInit {
  // Data
  weeklyData: WeeklyAnalyticsResponse | null = null;
  monthlyData: MonthlyAnalyticsResponse | null = null;
  
  // UI State
  activeTab: 'weekly' | 'monthly' = 'weekly';
  loading = false;
  error: string | null = null;
  
  // Date selection
  selectedWeekStart: string = '';
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  
  // Chart data
  chartData: any = null;
  
  constructor(
    private mentalHealthService: MentalHealthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadWeeklyAnalytics();
  }

  loadWeeklyAnalytics() {
    this.loading = true;
    this.error = null;
    this.activeTab = 'weekly';
    
    const weekStart = this.selectedWeekStart || this.getCurrentWeekStart();
    
    this.mentalHealthService.getWeeklyAnalytics(weekStart).subscribe({
      next: (response) => {
        this.weeklyData = response;
        this.loading = false;
        this.generateChartData();
      },
      error: (error) => {
        console.error('Error loading weekly analytics:', error);
        this.error = 'Failed to load weekly analytics';
        this.loading = false;
      }
    });
  }

  loadMonthlyAnalytics() {
    this.loading = true;
    this.error = null;
    this.activeTab = 'monthly';
    
    this.mentalHealthService.getMonthlyAnalytics(this.selectedMonth, this.selectedYear).subscribe({
      next: (response) => {
        this.monthlyData = response;
        this.loading = false;
        this.generateChartData();
      },
      error: (error) => {
        console.error('Error loading monthly analytics:', error);
        this.error = 'Failed to load monthly analytics';
        this.loading = false;
      }
    });
  }

  generateChartData() {
    const data = this.activeTab === 'weekly' ? this.weeklyData : this.monthlyData;
    if (!data || !data.assessments.length) {
      this.chartData = null;
      return;
    }

    const assessments = data.assessments;
    const labels = assessments.map(a => new Date(a.createdAt).toLocaleDateString());
    
    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Mood Level',
          data: assessments.map(a => a.answers.moodLevel),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Stress Level',
          data: assessments.map(a => a.answers.stressLevel),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        },
        {
          label: 'Sleep Hours',
          data: assessments.map(a => a.answers.sleepHours),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }
      ]
    };
  }

  getCurrentWeekStart(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  getTrendIcon(trend: string): string {
    switch (trend.toLowerCase()) {
      case 'improving':
        return 'fas fa-arrow-up text-success';
      case 'declining':
        return 'fas fa-arrow-down text-danger';
      case 'stable':
        return 'fas fa-minus text-info';
      default:
        return 'fas fa-question text-muted';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend.toLowerCase()) {
      case 'improving':
        return 'text-success';
      case 'declining':
        return 'text-danger';
      case 'stable':
        return 'text-info';
      default:
        return 'text-muted';
    }
  }

  getRiskLevelClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'Low':
        return 'badge bg-success';
      case 'Medium':
        return 'badge bg-warning';
      case 'High':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getRecommendationsAsArray(recommendations: string | string[]): string[] {
    return Array.isArray(recommendations) ? recommendations : [recommendations];
  }

  switchToWeekly() {
    if (this.activeTab !== 'weekly') {
      this.loadWeeklyAnalytics();
    }
  }

  switchToMonthly() {
    if (this.activeTab !== 'monthly') {
      this.loadMonthlyAnalytics();
    }
  }

  onWeekStartChange() {
    if (this.selectedWeekStart) {
      this.loadWeeklyAnalytics();
    }
  }

  onMonthYearChange() {
    this.loadMonthlyAnalytics();
  }

  goToHistory() {
    this.router.navigate(['/history']);
  }

  goToCalendar() {
    this.router.navigate(['/calendar']);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  downloadReport() {
    this.mentalHealthService.downloadReport().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `health-analytics-${new Date().toISOString().split('T')[0]}.txt`);
      },
      error: (error) => {
        console.error('Error downloading report:', error);
        alert('Failed to download report. Please try again.');
      }
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
