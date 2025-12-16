import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { MentalHealthService, Assessment } from '../services/mental-health.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './history.html',
  styleUrls: ['./history.css']
})
export class HistoryComponent implements OnInit {
  assessments: Assessment[] = [];
  loading = true;
  error: string | null = null;
  
  // Calculated properties for template
  averageStress: number = 0;
  averageMood: number = 0;
  averageSleep: number = 0;
  lowRiskCount: number = 0;
  mediumRiskCount: number = 0;
  highRiskCount: number = 0;

  constructor(
    private mentalHealthService: MentalHealthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAssessmentHistory();
  }

  loadAssessmentHistory() {
    this.loading = true;
    this.error = null;
    
    this.mentalHealthService.getAssessmentHistory().subscribe({
      next: (response) => {
        this.assessments = response.assessments || [];
        this.calculateStatistics();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading assessment history:', error);
        this.error = 'Failed to load assessment history';
        this.loading = false;
      }
    });
  }

  private calculateStatistics() {
    if (this.assessments.length === 0) {
      return;
    }

    // Calculate averages for recent assessments (last 5)
    const recentAssessments = this.assessments.slice(0, 5);
    this.averageStress = recentAssessments.reduce((sum, a) => sum + a.answers.stressLevel, 0) / recentAssessments.length;
    this.averageMood = recentAssessments.reduce((sum, a) => sum + a.answers.moodLevel, 0) / recentAssessments.length;
    this.averageSleep = recentAssessments.reduce((sum, a) => sum + a.answers.sleepHours, 0) / recentAssessments.length;

    // Calculate risk level counts
    this.lowRiskCount = this.assessments.filter(a => a.aiAnalysis?.riskLevel === 'Low').length;
    this.mediumRiskCount = this.assessments.filter(a => a.aiAnalysis?.riskLevel === 'Medium').length;
    this.highRiskCount = this.assessments.filter(a => a.aiAnalysis?.riskLevel === 'High').length;
  }

  getRiskLevelClass(riskLevel: string | undefined): string {
    if (!riskLevel) return 'text-secondary';
    switch (riskLevel) {
      case 'Low':
        return 'text-success';
      case 'Medium':
        return 'text-warning';
      case 'High':
        return 'text-danger';
      default:
        return 'text-secondary';
    }
  }

  getMoodIcon(mood: string): string {
    switch (mood) {
      case 'Happy':
        return 'fas fa-smile';
      case 'Sad':
        return 'fas fa-frown';
      case 'Anxious':
        return 'fas fa-exclamation-triangle';
      case 'Stressed':
        return 'fas fa-tired';
      case 'Neutral':
        return 'fas fa-meh';
      default:
        return 'fas fa-question';
    }
  }


  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getRecommendationsAsArray(recommendations: string | string[] | undefined): string[] {
    if (!recommendations) return [];
    return Array.isArray(recommendations) ? recommendations : [recommendations];
  }

  downloadReport() {
    // Download report from backend
    this.mentalHealthService.downloadReport().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `mental-health-report-${new Date().toISOString().split('T')[0]}.txt`)
      },
      error: (error) => {
        console.error('Error downloading report:', error)
        alert('Failed to download report. Please try again.')
      }
    })
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  goBack() {
    this.router.navigate(['/profile']);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }
}
