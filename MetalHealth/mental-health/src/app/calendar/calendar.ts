import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { trigger, transition, style, animate, stagger, query } from "@angular/animations"
import { NavbarComponent } from "../navbar/navbar"
import { MentalHealthService, Assessment } from "../services/mental-health.service"

interface MoodEntry {
  date: string;
  mood: string;
  notes?: string;
  timestamp: Date;
}

interface MoodOption {
  value: string;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: "app-calendar",
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: "./calendar.html",
  styleUrls: ["./calendar.css"],
  animations: [
    trigger('dayAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ])
  ]
})
export class CalendarComponent implements OnInit {
  currentDate = new Date()
  selectedDay: number | null = null
  selectedDate: Date | null = null
  selectedMood: string = ''
  moodNotes: string = ''
  moodEntries: MoodEntry[] = []
  assessments: Assessment[] = []
  selectedDayAssessments: Assessment[] = []
  showAssessmentModal = false
  loadingAssessments = false
  assessmentError: string | null = null
  
  // Daily summaries
  dailySummaries: any[] = []
  showSummariesModal = false
  loadingSummaries = false
  summariesError: string | null = null
  
  // Summary editing
  showEditSummaryModal = false
  editingSummary: any = null
  editSummaryText = ''
  isSavingEdit = false
  
  // Date summary viewing
  showDateSummaryModal = false
  selectedDateSummary: any = null
  selectedDateForSummary: Date | null = null

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  moodOptions: MoodOption[] = [
    { value: 'excellent', label: 'Excellent', icon: 'fas fa-laugh', color: '#10b981' },
    { value: 'good', label: 'Good', icon: 'fas fa-smile', color: '#3b82f6' },
    { value: 'neutral', label: 'Neutral', icon: 'fas fa-meh', color: '#6b7280' },
    { value: 'poor', label: 'Poor', icon: 'fas fa-frown', color: '#f59e0b' },
    { value: 'terrible', label: 'Terrible', icon: 'fas fa-sad-tear', color: '#ef4444' }
  ]

  constructor(
    private mentalHealthService: MentalHealthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadMoodEntries()
    this.loadAssessments()
    this.loadDailySummaries()
  }

  get monthName(): string {
    return this.currentDate.toLocaleString(undefined, { month: "long", year: "numeric" })
  }

  get daysArray(): number[] {
    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startWeekday = firstDay.getDay() // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = Array(startWeekday).fill(0).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
    while (cells.length % 7 !== 0) cells.push(0)
    return cells
  }

  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
    this.selectedDay = null
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
    this.selectedDay = null
  }

  selectDay(day: number): void {
    if (day === 0) return
    
    // Check if the selected date is in the future (excluding today)
    const selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()) // Start of today
    
    if (selectedDate > todayStart) {
      alert('You cannot access future dates. Please select today or a past date.')
      return
    }
    
    this.selectedDay = day
    this.selectedDate = selectedDate
    
    // Check if there are assessments for this day
    this.selectedDayAssessments = this.getAssessmentsForDay(day)
    
    // Check if there's a summary for this date
    const dateString = selectedDate.toDateString()
    const hasSummary = this.dailySummaries.some(s => s.date === dateString)
    
    // Always allow mood entry, regardless of whether there are assessments
    // Check if there's already a mood entry for this day
    const existingEntry = this.getMoodEntryForDay(day)
    if (existingEntry) {
      this.selectedMood = existingEntry.mood
      this.moodNotes = existingEntry.notes || ''
    } else {
      this.selectedMood = ''
      this.moodNotes = ''
    }
    
    // Open mood modal
    this.openMoodModal()
  }

  isToday(day: number): boolean {
    if (day === 0) return false
    const today = new Date()
    return this.currentDate.getFullYear() === today.getFullYear() &&
           this.currentDate.getMonth() === today.getMonth() &&
           day === today.getDate()
  }

  hasMoodEntry(day: number): boolean {
    if (day === 0) return false
    return this.getMoodEntryForDay(day) !== null
  }

  getMoodForDay(day: number): string {
    if (day === 0) return ''
    const entry = this.getMoodEntryForDay(day)
    return entry ? entry.mood : ''
  }

  getMoodEntryForDay(day: number): MoodEntry | null {
    if (day === 0) return null
    const dateStr = this.formatDateString(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
    return this.moodEntries.find(entry => entry.date === dateStr) || null
  }

  hasMultipleEntries(day: number): boolean {
    // Check if there are multiple assessments on this day
    if (day === 0) return false
    const dateStr = this.formatDateString(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
    const dayAssessments = this.getAssessmentsForDay(day)
    return dayAssessments.length > 1
  }

  hasAssessment(day: number): boolean {
    if (day === 0) return false
    const dayAssessments = this.getAssessmentsForDay(day)
    return dayAssessments.length > 0
  }

  getAssessmentsForDay(day: number): Assessment[] {
    if (day === 0) return []
    const dateStr = this.formatDateString(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
    return this.assessments.filter(assessment => {
      const assessmentDate = new Date(assessment.createdAt)
      const assessmentDateStr = this.formatDateString(
        assessmentDate.getFullYear(),
        assessmentDate.getMonth(),
        assessmentDate.getDate()
      )
      return assessmentDateStr === dateStr
    })
  }

  getAssessmentCount(day: number): number {
    return this.getAssessmentsForDay(day).length
  }

  getMoodIcon(mood: string): string {
    const moodOption = this.moodOptions.find(option => option.value === mood)
    return moodOption ? moodOption.icon : 'fas fa-circle'
  }

  selectMood(mood: string): void {
    this.selectedMood = mood
  }

  saveMood(): void {
    if (!this.selectedMood || !this.selectedDate) return

    const dateStr = this.formatDateString(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      this.selectedDate.getDate()
    )

    // Remove existing entry for this date
    this.moodEntries = this.moodEntries.filter(entry => entry.date !== dateStr)

    // Add new entry
    const newEntry: MoodEntry = {
      date: dateStr,
      mood: this.selectedMood,
      notes: this.moodNotes,
      timestamp: new Date()
    }

    this.moodEntries.push(newEntry)
    this.saveMoodEntries()
    
    // Show success feedback
    this.showSaveSuccess()
    
    this.closeMoodModal()
  }

  private showSaveSuccess(): void {
    // Create a temporary success message
    const successDiv = document.createElement('div')
    successDiv.className = 'alert alert-success position-fixed'
    successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;'
    successDiv.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>
      <strong>Mood saved successfully!</strong>
      <br><small>Your mood entry has been saved to the calendar.</small>
    `
    
    document.body.appendChild(successDiv)
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv)
      }
    }, 3000)
  }

  openMoodModal(): void {
    // Show the mood modal using Bootstrap
    const modal = document.getElementById('moodModal')
    if (modal) {
      // Create and show the modal using Bootstrap's modal API
      const bootstrap = (window as any).bootstrap
      if (bootstrap && bootstrap.Modal) {
        const modalInstance = new bootstrap.Modal(modal)
        modalInstance.show()
      } else {
        // Fallback: show the modal by adding show class and backdrop
        modal.classList.add('show')
        modal.style.display = 'block'
        document.body.classList.add('modal-open')
        
        // Add backdrop
        const backdrop = document.createElement('div')
        backdrop.className = 'modal-backdrop fade show'
        backdrop.id = 'moodModalBackdrop'
        document.body.appendChild(backdrop)
      }
    }
  }

  closeMoodModal(): void {
    // Hide the modal
    const modal = document.getElementById('moodModal')
    if (modal) {
      const bootstrap = (window as any).bootstrap
      if (bootstrap && bootstrap.Modal) {
        const modalInstance = bootstrap.Modal.getInstance(modal)
        if (modalInstance) {
          modalInstance.hide()
        }
      } else {
        // Fallback: hide the modal manually
        modal.classList.remove('show')
        modal.style.display = 'none'
        document.body.classList.remove('modal-open')
        
        // Remove backdrop
        const backdrop = document.getElementById('moodModalBackdrop')
        if (backdrop) {
          backdrop.remove()
        }
      }
    }
    
    this.selectedDay = null
    this.selectedDate = null
    this.selectedMood = ''
    this.moodNotes = ''
  }

  viewAssessmentsForDay(): void {
    // Close mood modal first
    this.closeMoodModal()
    
    // Show assessment modal
    this.showAssessmentModal = true
  }

  closeAssessmentModal(): void {
    this.showAssessmentModal = false
    this.selectedDay = null
    this.selectedDate = null
    this.selectedDayAssessments = []
  }

  loadAssessments(): void {
    this.loadingAssessments = true
    this.assessmentError = null
    
    this.mentalHealthService.getAssessmentHistory().subscribe({
      next: (response) => {
        this.assessments = response.assessments
        this.loadingAssessments = false
        console.log('Loaded assessments:', this.assessments.length)
      },
      error: (error) => {
        console.error('Error loading assessments:', error)
        this.assessmentError = 'Failed to load assessment data'
        this.loadingAssessments = false
      }
    })
  }

  getRiskLevelClass(riskLevel: string | undefined): string {
    if (!riskLevel) return 'text-secondary';
    switch (riskLevel) {
      case 'Low': return 'text-success'
      case 'Medium': return 'text-warning'
      case 'High': return 'text-danger'
      default: return 'text-secondary'
    }
  }

  getRiskLevelBadgeClass(riskLevel: string | undefined): string {
    if (!riskLevel) return 'bg-secondary';
    switch (riskLevel) {
      case 'Low': return 'bg-success'
      case 'Medium': return 'bg-warning'
      case 'High': return 'bg-danger'
      default: return 'bg-secondary'
    }
  }

  isArray(value: any): boolean {
    return Array.isArray(value)
  }

  getRecommendationsAsArray(recommendations: string | string[] | undefined): string[] {
    if (!recommendations) return [];
    return Array.isArray(recommendations) ? recommendations : [recommendations]
  }

  // Statistics methods
  getDaysWithMood(): number {
    return this.moodEntries.length
  }

  getAverageMood(): number {
    if (this.moodEntries.length === 0) return 0
    
    const moodValues = { excellent: 5, good: 4, neutral: 3, poor: 2, terrible: 1 }
    const total = this.moodEntries.reduce((sum, entry) => sum + (moodValues[entry.mood as keyof typeof moodValues] || 0), 0)
    return Math.round((total / this.moodEntries.length) * 10) / 10
  }

  getStreakDays(): number {
    // Simple streak calculation - in a real app, you'd want more sophisticated logic
    return Math.min(this.moodEntries.length, 30)
  }

  getBestMood(): string {
    if (this.moodEntries.length === 0) return 'N/A'
    
    const moodCounts = this.moodEntries.reduce((counts, entry) => {
      counts[entry.mood] = (counts[entry.mood] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const moodValues = { excellent: 5, good: 4, neutral: 3, poor: 2, terrible: 1 }
    const bestMood = Object.keys(moodCounts).reduce((best, current) => 
      (moodValues[current as keyof typeof moodValues] || 0) > (moodValues[best as keyof typeof moodValues] || 0) ? current : best
    )

    return this.moodOptions.find(option => option.value === bestMood)?.label || 'N/A'
  }

  private formatDateString(year: number, month: number, day: number): string {
    const date = new Date(year, month, day);
    return date.toDateString();
  }

  private loadMoodEntries(): void {
    // Load from localStorage or API
    const stored = localStorage.getItem('moodEntries')
    if (stored) {
      this.moodEntries = JSON.parse(stored).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }))
    }
  }

  private saveMoodEntries(): void {
    // Save to localStorage or API
    localStorage.setItem('moodEntries', JSON.stringify(this.moodEntries))
  }

  // New methods for calendar functionality
  viewAssessmentHistory(): void {
    this.router.navigate(['/history'])
  }

  downloadReport(): void {
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

  takeNewAssessment(): void {
    this.router.navigate(['/home'])
  }

  writeDailySummary(): void {
    this.router.navigate(['/home'])
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Clear all calendar data
  clearAllData(): void {
    // Show confirmation dialog
    if (confirm('Are you sure you want to clear all mood entries? This action cannot be undone.')) {
      // Clear mood entries from localStorage
      localStorage.removeItem('moodEntries')
      this.moodEntries = []
      
      // Clear assessments (this will be cleared when loadAssessments runs)
      this.assessments = []
      this.selectedDayAssessments = []
      
      // Reset selected day
      this.selectedDay = null
      this.selectedDate = null
      this.selectedMood = ''
      this.moodNotes = ''
      
      // Show success message
      alert('All mood data has been cleared successfully!')
    }
  }

  // Check if a date is in the future (excluding today)
  isFutureDate(day: number): boolean {
    if (day === 0) return false
    const selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()) // Start of today
    return selectedDate > todayStart
  }

  // Load daily summaries
  loadDailySummaries(): void {
    this.loadingSummaries = true
    this.summariesError = null
    
    this.mentalHealthService.getDailySummaries().subscribe({
      next: (response) => {
        this.dailySummaries = response.summaries || []
        this.loadingSummaries = false
        console.log('Loaded daily summaries:', this.dailySummaries.length)
        
        // If no summaries from API, try localStorage
        if (this.dailySummaries.length === 0) {
          this.loadSummariesFromLocalStorage()
        }
      },
      error: (error) => {
        console.error('Error loading daily summaries:', error)
        this.loadingSummaries = false
        
        // Fallback to localStorage
        this.loadSummariesFromLocalStorage()
        
        // Only show error if localStorage also fails
        if (this.dailySummaries.length === 0) {
          if (error.status === 401) {
            this.summariesError = 'Please log in to view your daily summaries.'
          } else if (error.status === 404) {
            this.summariesError = 'No daily summaries found. Start writing your first summary!'
          } else {
            this.summariesError = 'Unable to load daily summaries. Using local data if available.'
          }
        } else {
          // Clear error if we successfully loaded from localStorage
          this.summariesError = null
        }
      }
    })
  }

  // Fallback to load summaries from localStorage
  private loadSummariesFromLocalStorage(): void {
    const stored = localStorage.getItem('dailySummaries')
    if (stored) {
      try {
        const parsedSummaries = JSON.parse(stored)
        this.dailySummaries = Array.isArray(parsedSummaries) ? parsedSummaries : []
        this.loadingSummaries = false
        console.log('Loaded daily summaries from localStorage:', this.dailySummaries.length)
      } catch (error) {
        console.error('Error parsing localStorage summaries:', error)
        this.dailySummaries = []
        this.loadingSummaries = false
      }
    } else {
      this.dailySummaries = []
      this.loadingSummaries = false
    }
  }

  // Show daily summaries modal
  showDailySummaries(): void {
    this.showSummariesModal = true
  }

  // Close daily summaries modal
  closeSummariesModal(): void {
    this.showSummariesModal = false
  }

  // Get summary for a specific day
  getSummaryForDay(day: number): any | null {
    if (day === 0) return null
    const dateStr = this.formatDateString(this.currentDate.getFullYear(), this.currentDate.getMonth(), day)
    return this.dailySummaries.find(summary => summary.date === dateStr) || null
  }

  // Check if a day has a summary
  hasSummary(day: number): boolean {
    return this.getSummaryForDay(day) !== null
  }

  // Convert newlines to HTML breaks for display
  nl2br(text: string): string {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  }

  // Create sample data for testing (remove this in production)
  createSampleSummaries(): void {
    const sampleSummaries = [
      {
        date: new Date().toISOString().split('T')[0],
        summary: "Today was a good day. I felt productive and accomplished several tasks. My mood was positive throughout the day, and I managed to stay focused on my goals. I'm looking forward to tomorrow.",
        timestamp: new Date().toISOString()
      },
      {
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        summary: "Had some challenges today but managed to work through them. Feeling a bit stressed about upcoming deadlines, but I'm taking it one step at a time. Need to remember to take breaks.",
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    localStorage.setItem('dailySummaries', JSON.stringify(sampleSummaries));
    this.dailySummaries = sampleSummaries;
    this.summariesError = null;
    this.loadingSummaries = false;
  }

  // Edit summary functionality
  editSummary(summary: any): void {
    this.editingSummary = summary;
    this.editSummaryText = summary.summary;
    this.showEditSummaryModal = true;
  }

  saveEditedSummary(): void {
    if (!this.editSummaryText.trim()) {
      alert('Please write something in your summary.');
      return;
    }

    this.isSavingEdit = true;

    // Update the summary in the array
    const summaryIndex = this.dailySummaries.findIndex(s => s.date === this.editingSummary.date);
    if (summaryIndex !== -1) {
      this.dailySummaries[summaryIndex].summary = this.editSummaryText.trim();
      this.dailySummaries[summaryIndex].timestamp = new Date().toISOString();
      this.dailySummaries[summaryIndex].isSynthetic = false; // Mark as personal since user edited it
    }

    // Save to localStorage as fallback
    localStorage.setItem('dailySummaries', JSON.stringify(this.dailySummaries));

    // Call API to update (if available)
    this.mentalHealthService.saveDailySummary(this.editSummaryText, false).subscribe({
      next: (response) => {
        this.isSavingEdit = false;
        this.closeEditSummaryModal();
        this.showSaveSuccess();
      },
      error: (error) => {
        console.error('Error updating summary:', error);
        this.isSavingEdit = false;
        this.closeEditSummaryModal();
        this.showSaveSuccess(); // Still show success since we saved locally
      }
    });
  }

  closeEditSummaryModal(): void {
    this.showEditSummaryModal = false;
    this.editingSummary = null;
    this.editSummaryText = '';
    this.isSavingEdit = false;
  }

  deleteSummary(summary: any): void {
    if (confirm('Are you sure you want to delete this summary? This action cannot be undone.')) {
      // Remove from array
      this.dailySummaries = this.dailySummaries.filter(s => s.date !== summary.date);
      
      // Update localStorage
      localStorage.setItem('dailySummaries', JSON.stringify(this.dailySummaries));
      
      // Show success message
      this.showDeleteSuccess();
    }
  }

  // Show summary for a specific date
  showSummaryForDate(day: number): void {
    if (day === 0) return;

    const selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
    const dateString = selectedDate.toDateString();
    
    // Find summary for this date
    const summary = this.dailySummaries.find(s => s.date === dateString);
    
    if (summary) {
      this.selectedDateSummary = summary;
      this.selectedDateForSummary = selectedDate;
      this.showDateSummaryModal = true;
    } else {
      // No summary found for this date
      alert(`No summary found for ${selectedDate.toLocaleDateString()}. You can write one by clicking "Write Daily Summary" in the action buttons.`);
    }
  }

  closeDateSummaryModal(): void {
    this.showDateSummaryModal = false;
    this.selectedDateSummary = null;
    this.selectedDateForSummary = null;
  }

  hasSummaryForSelectedDate(): boolean {
    if (!this.selectedDate) return false;
    const dateString = this.selectedDate.toDateString();
    return this.dailySummaries.some(s => s.date === dateString);
  }

  private showDeleteSuccess(): void {
    const successDiv = document.createElement('div')
    successDiv.className = 'alert alert-warning position-fixed'
    successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;'
    successDiv.innerHTML = `
      <i class="fas fa-trash me-2"></i>
      <strong>Summary deleted successfully!</strong>
      <br><small>The summary has been removed from your calendar.</small>
    `
    
    document.body.appendChild(successDiv)
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv)
      }
    }, 3000)
  }
}
