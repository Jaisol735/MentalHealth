import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { trigger, transition, style, animate, query, stagger } from "@angular/animations"
import { NavbarComponent } from "../navbar/navbar"
import { MentalHealthService, MentalHealthAnswers, Assessment } from "../services/mental-health.service"
import { AuthService } from "../services/auth.service"
import { DoctorService, Doctor } from "../services/doctor.service"

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  id: string;
  text: string;
  type: 'select' | 'range' | 'number' | 'textarea' | 'text';
  min: number;
  max: number;
  options: QuestionOption[];
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: "./home.html",
  styleUrls: ["./home.css"],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0, transform: 'translateY(-30px)' }))
      ])
    ]),
    trigger('questionAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' }))
      ])
    ]),
    trigger('progressAnimation', [
      transition(':enter', [
        style({ width: '0%' }),
        animate('600ms ease-out', style({ width: '*' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit {
  currentQuestionIndex = 0;
  isAssessmentComplete = false;
  isSubmitting = false;
  latestAssessment: Assessment | null = null;
  showResults = false;
  hasCompletedDailyQuestions = false;
  showDailySummary = false;
  dailySummaryText = '';
  isSavingSummary = false;
  existingSummaryId: string | null = null;
  isUpdatingSummary = false;
  recommendedDoctors: Doctor[] = [];

  answers: MentalHealthAnswers = {
    // Core Daily Metrics
    mood: 'Neutral',
    moodLevel: 5,
    stressLevel: 5,
    sleepHours: 8,
    sleepQuality: 'Good',
    anxietyFrequency: 'A little',
    energyLevel: 'Moderate',
    overwhelmedFrequency: 'Slightly',
    socialConnection: 'Neutral',
    dailyFunctioning: 'Good',
    
    // Legacy fields
    wantsSummary: false,
    todaySummary: '',
    wantsInstagramAnalysis: false,
    instagramAnalysis: '',
    commonFeeling: ''
  };

  // Daily mental health check-in questions (asked on first login of each day)
  dailyQuestions: Question[] = [
    // Core Daily Metrics
    {
      id: 'mood',
      text: 'How are you feeling today?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Very Happy', label: 'Very Happy' },
        { value: 'Happy', label: 'Happy' },
        { value: 'Neutral', label: 'Neutral' },
        { value: 'Sad', label: 'Sad' },
        { value: 'Very Sad', label: 'Very Sad' },
        { value: 'Anxious', label: 'Anxious' },
        { value: 'Irritable', label: 'Irritable' },
        { value: 'Empty/Numb', label: 'Empty/Numb' }
      ]
    },
    {
      id: 'moodLevel',
      text: 'On a scale of 1–10, how would you rate your overall mood today?',
      type: 'range',
      min: 1,
      max: 10,
      options: []
    },
    {
      id: 'stressLevel',
      text: 'On a scale of 1–10, how would you rate your stress level today?',
      type: 'range',
      min: 1,
      max: 10,
      options: []
    },
    {
      id: 'sleepHours',
      text: 'How many hours of sleep did you get last night?',
      type: 'number',
      min: 0,
      max: 24,
      options: []
    },
    {
      id: 'sleepQuality',
      text: 'How would you rate the quality of your sleep last night?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Excellent', label: 'Excellent' },
        { value: 'Good', label: 'Good' },
        { value: 'Fair', label: 'Fair' },
        { value: 'Poor', label: 'Poor' },
        { value: 'Very Poor', label: 'Very Poor' }
      ]
    },
    {
      id: 'anxietyFrequency',
      text: 'How anxious or worried have you felt today?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Not at all', label: 'Not at all' },
        { value: 'A little', label: 'A little' },
        { value: 'Moderately', label: 'Moderately' },
        { value: 'Quite a bit', label: 'Quite a bit' },
        { value: 'Extremely', label: 'Extremely' }
      ]
    },
    {
      id: 'energyLevel',
      text: 'How would you rate your energy level today?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Very High', label: 'Very High' },
        { value: 'High', label: 'High' },
        { value: 'Moderate', label: 'Moderate' },
        { value: 'Low', label: 'Low' },
        { value: 'Very Low', label: 'Very Low' }
      ]
    },
    {
      id: 'overwhelmedFrequency',
      text: 'How overwhelmed do you feel by today\'s tasks and responsibilities?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Not at all', label: 'Not at all' },
        { value: 'Slightly', label: 'Slightly' },
        { value: 'Moderately', label: 'Moderately' },
        { value: 'Very', label: 'Very' },
        { value: 'Extremely', label: 'Extremely' }
      ]
    },
    {
      id: 'socialConnection',
      text: 'How connected do you feel to others today?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Very Connected', label: 'Very Connected' },
        { value: 'Connected', label: 'Connected' },
        { value: 'Neutral', label: 'Neutral' },
        { value: 'Isolated', label: 'Isolated' },
        { value: 'Very Isolated', label: 'Very Isolated' }
      ]
    },
    {
      id: 'dailyFunctioning',
      text: 'How well are you able to complete your daily activities today?',
      type: 'select',
      min: 0,
      max: 0,
      options: [
        { value: 'Excellent', label: 'Excellent - no difficulties' },
        { value: 'Good', label: 'Good - minor difficulties' },
        { value: 'Fair', label: 'Fair - some difficulties' },
        { value: 'Poor', label: 'Poor - many difficulties' },
        { value: 'Very Poor', label: 'Very poor - struggling to function' }
      ]
    }
  ];

  // Legacy questions array for backward compatibility
  get questions(): Question[] {
    return this.dailyQuestions;
  }

  constructor(
    private router: Router,
    private mentalHealthService: MentalHealthService,
    private authService: AuthService,
    private doctorService: DoctorService
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.checkTodaysAssessment();
  }

  checkTodaysAssessment() {
    // Check if user has already completed today's assessment
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    this.mentalHealthService.getAssessmentByDate(today).subscribe({
      next: (response) => {
        if (response.assessment) {
          // User has already completed today's assessment
          this.latestAssessment = response.assessment;
          this.isAssessmentComplete = true;
          this.hasCompletedDailyQuestions = true;
          this.loadDoctorRecommendations();
          console.log('Today\'s assessment already completed:', response.assessment);
        } else {
          // No assessment for today, show the daily check-in
          this.initializeForNewAssessment();
        }
      },
      error: (error) => {
        console.error('Error checking today\'s assessment:', error);
        // Fallback: show assessment if there's an error
        this.initializeForNewAssessment();
      }
    });
  }

  initializeForNewAssessment() {
    // Reset flags for new assessment
    this.isAssessmentComplete = false;
    this.showResults = false;
    this.hasCompletedDailyQuestions = false;
    this.showDailySummary = false;
    this.currentQuestionIndex = 0;
    
    // Load latest assessment for doctor recommendations
    this.loadLatestAssessment();
    this.loadDoctorRecommendations();
    
    console.log('Ready for new daily assessment');
  }

  checkDailyQuestionsStatus() {
    // Check if daily questions have been completed today
    const today = new Date().toDateString();
    const lastCompletedDate = localStorage.getItem('lastDailyQuestionsDate');
    
    console.log('Checking daily questions status:', { today, lastCompletedDate });
    
    if (lastCompletedDate === today) {
      this.hasCompletedDailyQuestions = true;
      this.showDailySummary = false; // Don't auto-show summary, let user choose
    } else {
      this.hasCompletedDailyQuestions = false;
      this.showDailySummary = false;
    }
    
    console.log('Daily questions status:', { 
      hasCompletedDailyQuestions: this.hasCompletedDailyQuestions, 
      showDailySummary: this.showDailySummary 
    });
  }

  loadLatestAssessment() {
    this.mentalHealthService.getLatestAssessment().subscribe({
      next: (response) => {
        this.latestAssessment = response.assessment;
        // Load doctor recommendations based on risk level
        this.loadDoctorRecommendations();
      },
      error: (error) => {
        console.error('Error loading latest assessment:', error);
        if (error.status === 401) {
          this.router.navigate(['/login']);
        }
        // Don't show error for 404 (no assessments yet)
        if (error.status !== 404) {
          console.log('Could not load previous assessments');
        }
      }
    });
  }

  loadDoctorRecommendations() {
    console.log('Loading doctor recommendations...');
    console.log('Latest assessment:', this.latestAssessment);

    if (!this.latestAssessment?.aiAnalysis?.riskLevel) {
      console.log('No risk level found in assessment');
      return;
    }

    const riskLevel = this.latestAssessment.aiAnalysis.riskLevel.toLowerCase();
    const answers = this.latestAssessment.answers;
    console.log('Risk level detected:', riskLevel);
    console.log('Assessment answers:', answers);

    let specialties: string[] = [];

    // Determine specialties based on daily assessment
    if (riskLevel === 'high') {
      specialties = ['Crisis Intervention', 'Psychiatry'];
      console.log('High risk - recommending crisis and psychiatry specialists');
    } else {
      // Analyze daily metrics for recommendations
      
      // Mood & Depression
      if (answers.mood && ['Sad', 'Very Sad', 'Empty/Numb'].includes(answers.mood)) {
        specialties.push('Mood Disorders');
      }
      if (answers.moodLevel && answers.moodLevel <= 3) {
        specialties.push('Mood Disorders');
      }
      
      // Anxiety
      if (answers.anxietyFrequency && ['Quite a bit', 'Extremely'].includes(answers.anxietyFrequency)) {
        specialties.push('Anxiety Disorders');
      }
      if (answers.stressLevel && answers.stressLevel >= 8) {
        specialties.push('Anxiety Disorders');
      }
      
      // Sleep Issues
      if (answers.sleepQuality && ['Poor', 'Very Poor'].includes(answers.sleepQuality)) {
        specialties.push('Sleep Medicine');
      }
      if (answers.sleepHours && (answers.sleepHours < 6 || answers.sleepHours > 10)) {
        specialties.push('Sleep Medicine');
      }
      
      // Social Isolation
      if (answers.socialConnection && ['Isolated', 'Very Isolated'].includes(answers.socialConnection)) {
        specialties.push('Clinical Psychology');
      }
      
      // Overwhelm & Functioning
      if (answers.overwhelmedFrequency && ['Very', 'Extremely'].includes(answers.overwhelmedFrequency)) {
        specialties.push('Workplace Mental Health');
      }
      if (answers.dailyFunctioning && ['Poor', 'Very Poor'].includes(answers.dailyFunctioning)) {
        specialties.push('Clinical Psychology');
      }
      
      // Energy Issues
      if (answers.energyLevel && ['Low', 'Very Low'].includes(answers.energyLevel)) {
        specialties.push('Clinical Psychology');
      }
      
      // Default recommendations if no specific conditions identified
      if (specialties.length === 0) {
        if (riskLevel === 'medium') {
          specialties = ['Clinical Psychology', 'Psychiatry'];
        } else {
          specialties = ['Clinical Psychology'];
        }
      }
      
      // Remove duplicates and limit to 2 specialties
      specialties = [...new Set(specialties)].slice(0, 2);
      console.log('Daily assessment - recommending specialties:', specialties);
    }

    // Load doctors for the first specialty (limit to 2 doctors)
    if (specialties.length > 0) {
      console.log('Fetching doctors for specialty:', specialties[0]);
      this.doctorService.getDoctorsBySpeciality(specialties[0]).subscribe({
        next: (response) => {
          console.log('Doctor API response:', response);
          this.recommendedDoctors = response.doctors.slice(0, 2);
          console.log('Recommended doctors set:', this.recommendedDoctors);
        },
        error: (error) => {
          console.error('Error loading doctor recommendations:', error);
          // Fallback: try to get any available doctors
          this.doctorService.getAllDoctors().subscribe({
            next: (response) => {
              this.recommendedDoctors = response.doctors.slice(0, 2);
              console.log('Fallback doctors loaded:', this.recommendedDoctors);
            },
            error: (fallbackError) => {
              console.error('Fallback doctor loading also failed:', fallbackError);
            }
          });
        }
      });
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      // Skip conditional questions that shouldn't be shown
      while (this.currentQuestionIndex < this.questions.length - 1 && 
             !this.shouldShowQuestion(this.questions[this.currentQuestionIndex].id)) {
        this.currentQuestionIndex++;
      }
    }
  }

  shouldShowQuestion(questionId: string): boolean {
    // All daily questions are always shown
    return true;
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      // Skip conditional questions that shouldn't be shown when going back
      while (this.currentQuestionIndex > 0 && 
             !this.shouldShowQuestion(this.questions[this.currentQuestionIndex].id)) {
        this.currentQuestionIndex--;
      }
    }
  }

  submitAssessment() {
    this.isSubmitting = true;
    
    // Debug: Log all answers before submission
    console.log('All answers before submission:', this.answers);
    console.log('Answers object keys:', Object.keys(this.answers));
    
    // Create a daily answers object for the API (10 core daily questions)
    const dailyAnswers: MentalHealthAnswers = {
      // Core Daily Metrics
      mood: this.answers.mood || 'Neutral',
      moodLevel: this.answers.moodLevel || 5,
      stressLevel: this.answers.stressLevel || 5,
      sleepHours: this.answers.sleepHours || 8,
      sleepQuality: this.answers.sleepQuality || 'Good',
      anxietyFrequency: this.answers.anxietyFrequency || 'A little',
      energyLevel: this.answers.energyLevel || 'Moderate',
      overwhelmedFrequency: this.answers.overwhelmedFrequency || 'Slightly',
      socialConnection: this.answers.socialConnection || 'Neutral',
      dailyFunctioning: this.answers.dailyFunctioning || 'Good',
      
      // Legacy fields
      wantsSummary: false,
      todaySummary: '',
      wantsInstagramAnalysis: false,
      instagramAnalysis: '',
      commonFeeling: ''
    };

    console.log('Submitting daily answers:', dailyAnswers);
    console.log('Answers object keys:', Object.keys(dailyAnswers));
    console.log('Answers object values:', Object.values(dailyAnswers));

    this.mentalHealthService.submitAssessment(dailyAnswers).subscribe({
      next: (response) => {
        this.latestAssessment = response.assessment;
        this.isAssessmentComplete = true;
        this.showResults = true;
        this.isSubmitting = false;
        
        // Load doctor recommendations based on the new assessment
        this.loadDoctorRecommendations();
        
        // Mark daily questions as completed for today
        const today = new Date().toDateString();
        localStorage.setItem('lastDailyQuestionsDate', today);
        this.hasCompletedDailyQuestions = true;
        this.showDailySummary = false; // Don't auto-show summary, let user choose
      },
      error: (error) => {
        console.error('Error submitting assessment:', error);
        this.isSubmitting = false;
        
        let errorMessage = 'Failed to submit assessment. Please try again.';
        
        if (error.status === 401) {
          errorMessage = 'Please log in to submit an assessment.';
          this.router.navigate(['/login']);
        } else if (error.status === 400) {
          // More specific error message
          if (error.error && error.error.message) {
            errorMessage = `Validation error: ${error.error.message}`;
          } else {
            errorMessage = 'Please check your answers and try again.';
          }
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        console.log('Error details:', error);
        alert(errorMessage);
      }
    });
  }

  startNewAssessment() {
    this.currentQuestionIndex = 0;
    this.isAssessmentComplete = false;
    this.showResults = false;
    this.hasCompletedDailyQuestions = false;
    this.showDailySummary = false;
    this.answers = {
      // Core Daily Metrics
      mood: 'Neutral',
      moodLevel: 5,
      stressLevel: 5,
      sleepHours: 8,
      sleepQuality: 'Good',
      anxietyFrequency: 'A little',
      energyLevel: 'Moderate',
      overwhelmedFrequency: 'Slightly',
      socialConnection: 'Neutral',
      dailyFunctioning: 'Good',
      
      // Legacy fields
      wantsSummary: false,
      todaySummary: '',
      wantsInstagramAnalysis: false,
      instagramAnalysis: '',
      commonFeeling: ''
    };
    console.log('New assessment started - questions should be visible');
  }

  startAssessment() {
    // Check if assessment was already completed today
    if (this.hasCompletedDailyQuestions) {
      console.log('Assessment already completed today');
      return;
    }
    this.startNewAssessment();
  }

  startDailySummary() {
    this.showDailySummary = true;
    this.showResults = false;
    
    // Check if there's already a summary for today
    this.checkExistingSummary();
  }

  checkExistingSummary() {
    // Check if there's already a summary for today
    const today = new Date().toISOString().split('T')[0];
    
    // Try to load existing summary from localStorage first
    const stored = localStorage.getItem('dailySummaries');
    if (stored) {
      try {
        const summaries = JSON.parse(stored);
        const todaySummary = summaries.find((s: any) => s.date === today);
        if (todaySummary) {
          this.dailySummaryText = todaySummary.summary;
          this.existingSummaryId = todaySummary.id;
          this.isUpdatingSummary = true;
        }
      } catch (error) {
        console.error('Error parsing stored summaries:', error);
      }
    }
  }

  saveDailySummary() {
    if (!this.dailySummaryText.trim()) {
      alert('Please write something in your daily summary.');
      return;
    }

    this.isSavingSummary = true;
    
    // Determine if this is an update or new summary
    const isSynthetic = this.isUpdatingSummary && this.existingSummaryId ? false : false; // Personal summary
    
    this.mentalHealthService.saveDailySummary(this.dailySummaryText, isSynthetic).subscribe({
      next: (response) => {
        this.isSavingSummary = false;
        const message = this.isUpdatingSummary ? 'Daily summary updated successfully!' : 'Daily summary saved successfully!';
        alert(message);
        this.dailySummaryText = '';
        this.showDailySummary = false;
        this.isUpdatingSummary = false;
        this.existingSummaryId = null;
        
        // Reload the latest assessment to get updated AI analysis with the summary
        this.loadLatestAssessment();
      },
      error: (error) => {
        console.error('Error saving daily summary:', error);
        this.isSavingSummary = false;
        
        // Fallback to localStorage if API fails
        const today = new Date().toDateString();
        const summaryData = {
          date: today,
          summary: this.dailySummaryText,
          timestamp: new Date().toISOString()
        };
        
        const existingSummaries = JSON.parse(localStorage.getItem('dailySummaries') || '[]');
        const filteredSummaries = existingSummaries.filter((s: any) => s.date !== today);
        filteredSummaries.push(summaryData);
        localStorage.setItem('dailySummaries', JSON.stringify(filteredSummaries));
        
        alert('Daily summary saved locally!');
        this.dailySummaryText = '';
        this.showDailySummary = false;
        
        // Reload the latest assessment to get updated AI analysis with the summary
        this.loadLatestAssessment();
      }
    });
  }

  skipDailySummary() {
    // Create a synthetic summary from assessment data for analysis
    this.createSyntheticSummary();
    this.showDailySummary = false;
  }

  createSyntheticSummary() {
    if (!this.latestAssessment) return;
    
    const answers = this.latestAssessment.answers;
    const syntheticSummary = `Daily Check-in Summary:
- Mood (past week): ${answers.mood}
- Stress Level Today: ${answers.stressLevel}/10
- Mood Level Today: ${answers.moodLevel}/10
- Sleep Hours: ${answers.sleepHours} hours
- Anxiety Frequency: ${answers.anxietyFrequency}
- Overwhelmed Frequency: ${answers.overwhelmedFrequency}
- Additional Notes: ${answers.todaySummary || 'No additional notes provided'}`;

    // Save the synthetic summary
    this.mentalHealthService.saveDailySummary(syntheticSummary, true).subscribe({
      next: (response) => {
        console.log('Synthetic summary saved for analysis');
      },
      error: (error) => {
        console.error('Error saving synthetic summary:', error);
        // Fallback to localStorage
        const today = new Date().toDateString();
        const summaryData = {
          date: today,
          summary: syntheticSummary,
          timestamp: new Date().toISOString(),
          isSynthetic: true
        };
        
        const existingSummaries = JSON.parse(localStorage.getItem('dailySummaries') || '[]');
        const filteredSummaries = existingSummaries.filter((s: any) => s.date !== today);
        filteredSummaries.push(summaryData);
        localStorage.setItem('dailySummaries', JSON.stringify(filteredSummaries));
      }
    });
  }

  // Debug method to reset daily questions status (for testing)
  resetDailyQuestionsStatus() {
    localStorage.removeItem('lastDailyQuestionsDate');
    this.hasCompletedDailyQuestions = false;
    this.showDailySummary = false;
    this.isAssessmentComplete = false;
    this.showResults = false;
    this.currentQuestionIndex = 0;
    this.latestAssessment = null;
    this.recommendedDoctors = [];
    console.log('Daily questions status reset - ready for new assessment');
  }

  getCurrentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }

  getTotalQuestions(): number {
    let total = 0;
    for (let i = 0; i <= this.currentQuestionIndex; i++) {
      if (this.shouldShowQuestion(this.questions[i].id)) {
        total++;
      }
    }
    // Add remaining questions that should be shown
    for (let i = this.currentQuestionIndex + 1; i < this.questions.length; i++) {
      if (this.shouldShowQuestion(this.questions[i].id)) {
        total++;
      }
    }
    return total;
  }

  getProgressPercentage() {
    const totalQuestions = this.getTotalQuestions();
    const currentQuestionNumber = this.getCurrentQuestionNumber();
    return (currentQuestionNumber / totalQuestions) * 100;
  }

  getCurrentQuestionNumber(): number {
    let currentNumber = 0;
    for (let i = 0; i <= this.currentQuestionIndex; i++) {
      if (this.shouldShowQuestion(this.questions[i].id)) {
        currentNumber++;
      }
    }
    return currentNumber;
  }

  isLastQuestion(): boolean {
    // Check if we're at the last question that should be shown
    for (let i = this.currentQuestionIndex + 1; i < this.questions.length; i++) {
      if (this.shouldShowQuestion(this.questions[i].id)) {
        return false;
      }
    }
    return true;
  }

  getRiskLevelClass(riskLevel: string | undefined) {
    if (!riskLevel) return 'text-secondary';
    switch (riskLevel) {
      case 'Low': return 'text-success';
      case 'Medium': return 'text-warning';
      case 'High': return 'text-danger';
      default: return 'text-secondary';
    }
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getRecommendationsAsArray(recommendations: string | string[] | undefined): string[] {
    if (!recommendations) return [];
    return Array.isArray(recommendations) ? recommendations : [recommendations];
  }

  viewDoctorDetails(doctor: Doctor): void {
    // Navigate to info page and scroll to the specific doctor
    this.router.navigate(['/info'], { 
      queryParams: { 
        doctorId: doctor.doctor_id,
        highlight: 'true'
      } 
    });
  }
}
