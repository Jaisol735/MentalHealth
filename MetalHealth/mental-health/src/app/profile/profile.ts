import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { AuthService, type User } from "../services/auth.service"
import { NavbarComponent } from "../navbar/navbar"
import { MentalHealthService, Assessment } from "../services/mental-health.service"

interface Activity {
  title: string;
  time: string;
  icon: string;
  type: string;
}

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: "./profile.html",
  styleUrls: ["./profile.css"],
})
export class ProfileComponent implements OnInit {
  user: User | null
  assessments: Assessment[] = []
  loading = true
  error: string | null = null
  
  // Edit Profile Modal State
  showEditModal = false
  isSaving = false
  editError: string | null = null
  editSuccess: string | null = null
  editFormData = {
    name: '',
    email: '',
    phoneno: '',
    age: 0,
    gender: ''
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private mentalHealthService: MentalHealthService
  ) {
    this.user = this.authService.getCurrentUserValue()
  }

  ngOnInit() {
    // Subscribe to user data changes
    this.authService.currentUser$.subscribe(user => {
      this.user = user
      if (user) {
        // Load assessment data for statistics only when user is available
        this.loadAssessmentData()
      }
    })
    
    // If user is already loaded, load assessment data immediately
    if (this.user) {
      this.loadAssessmentData()
    }
  }

  loadAssessmentData() {
    this.loading = true
    this.error = null
    
    this.mentalHealthService.getAssessmentHistory().subscribe({
      next: (response) => {
        this.assessments = response.assessments || []
        this.loading = false
      },
      error: (error) => {
        console.error('Error loading assessment data:', error)
        this.error = 'Failed to load assessment data'
        this.loading = false
        // Initialize with empty array to prevent errors
        this.assessments = []
      }
    })
  }

  // Profile Statistics
  getAssessmentCount(): number {
    return this.assessments.length
  }

  getDaysActive(): number {
    if (this.assessments.length === 0) return 0
    
    // Get unique days from assessment dates
    const uniqueDays = new Set(
      this.assessments.map(assessment => 
        new Date(assessment.createdAt).toDateString()
      )
    )
    return uniqueDays.size
  }

  getStreakDays(): number {
    if (this.assessments.length === 0) return 0
    
    // Sort assessments by date (most recent first)
    const sortedAssessments = [...this.assessments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    // Get unique dates and sort them
    const uniqueDates = Array.from(new Set(
      sortedAssessments.map(assessment => 
        new Date(assessment.createdAt).toDateString()
      )
    )).map(dateStr => new Date(dateStr)).sort((a, b) => b.getTime() - a.getTime())
    
    if (uniqueDates.length === 0) return 0
    
    // Calculate consecutive days from today backwards
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const assessmentDate = new Date(uniqueDates[i])
      assessmentDate.setHours(0, 0, 0, 0)
      
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      
      if (assessmentDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }

  // Recent Activity
  getRecentActivity(): Activity[] {
    if (this.assessments.length === 0) {
      return [
        {
          title: 'No recent activity',
          time: 'Start by taking an assessment',
          icon: 'fas fa-info-circle',
          type: 'info'
        }
      ]
    }

    // Get the 4 most recent assessments and convert to activities
    const recentAssessments = [...this.assessments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)

    return recentAssessments.map(assessment => {
      const timeAgo = this.getTimeAgo(new Date(assessment.createdAt))
      const riskLevel = assessment.aiAnalysis?.riskLevel?.toLowerCase() || 'unknown'
      
      return {
        title: `Completed Mental Health Assessment (${riskLevel} risk)`,
        time: timeAgo,
        icon: this.getActivityIcon(riskLevel),
        type: this.getActivityType(riskLevel)
      }
    })
  }

  private getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  private getActivityIcon(riskLevel: string): string {
    switch (riskLevel) {
      case 'low':
        return 'fas fa-check-circle'
      case 'medium':
        return 'fas fa-exclamation-triangle'
      case 'high':
        return 'fas fa-exclamation-circle'
      default:
        return 'fas fa-clipboard-check'
    }
  }

  private getActivityType(riskLevel: string): string {
    switch (riskLevel) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'danger'
      default:
        return 'info'
    }
  }

  // Action Methods
  editProfile() {
    if (!this.user) {
      this.editError = 'No user data available'
      return
    }
    
    // Populate form with current user data
    this.editFormData = {
      name: this.user.name || '',
      email: this.user.email || '',
      phoneno: this.user.phoneno || '',
      age: this.user.age || 0,
      gender: this.user.gender || ''
    }
    
    // Reset error/success messages
    this.editError = null
    this.editSuccess = null
    
    // Show modal
    this.showEditModal = true
  }

  closeEditModal() {
    this.showEditModal = false
    this.editError = null
    this.editSuccess = null
    this.isSaving = false
  }

  saveProfile() {
    if (!this.user) {
      this.editError = 'No user data available'
      return
    }

    // Validate form data
    if (!this.editFormData.name || !this.editFormData.email || 
        !this.editFormData.phoneno || !this.editFormData.age || !this.editFormData.gender) {
      this.editError = 'Please fill in all required fields'
      return
    }

    if (this.editFormData.age <= 0) {
      this.editError = 'Age must be greater than 0'
      return
    }

    this.isSaving = true
    this.editError = null
    this.editSuccess = null

    // Prepare update data (only editable fields)
    const updateData = {
      name: this.editFormData.name.trim(),
      email: this.editFormData.email.trim(),
      phoneno: this.editFormData.phoneno.trim(),
      age: this.editFormData.age,
      gender: this.editFormData.gender
    }

    // Call the update service
    this.authService.updateProfile(this.user.id, updateData).subscribe({
      next: (response) => {
        this.isSaving = false
        this.editSuccess = response.message || 'Profile updated successfully'
        
        // Update the current user in the service and local state
        if (response.user) {
          const updatedUser: User = {
            ...this.user!,
            ...response.user
          }
          this.user = updatedUser
          // Update the auth service user subject
          this.authService.updateCurrentUser(updatedUser)
        } else {
          // If response doesn't have user, update from editFormData
          this.user = {
            ...this.user!,
            ...updateData
          }
          this.authService.updateCurrentUser(this.user)
        }
        
        // Close modal after a short delay to show success message
        setTimeout(() => {
          this.closeEditModal()
        }, 1500)
      },
      error: (error) => {
        this.isSaving = false
        console.error('Error updating profile:', error)
        
        if (error.status === 409) {
          this.editError = error.error?.message || 'Email or phone number already exists. Please use different values.'
        } else if (error.status === 403) {
          this.editError = 'You do not have permission to update this profile.'
        } else if (error.status === 404) {
          this.editError = 'User not found. Please try logging in again.'
        } else {
          this.editError = error.error?.message || 'Failed to update profile. Please try again.'
        }
      }
    })
  }

  takeAssessment() {
    this.router.navigate(['/home'])
  }

  viewCalendar() {
    this.router.navigate(['/calendar'])
  }

  viewHistory() {
    this.router.navigate(['/history'])
  }

  viewAnalytics() {
    this.router.navigate(['/analytics'])
  }

  downloadReport() {
    // Download report from backend
    this.mentalHealthService.downloadReport().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `mental-health-report-${new Date().toISOString().split('T')[0]}.txt`)
      },
      error: (error) => {
        console.error('Error downloading report:', error)
        // Fallback to client-side generation
        this.mentalHealthService.getAssessmentHistory().subscribe({
          next: (response) => {
            this.generateAndDownloadReport(response.assessments)
          },
          error: (fallbackError) => {
            console.error('Error loading assessment history for report:', fallbackError)
            alert('Failed to load assessment data for report generation')
          }
        })
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

  private generateAndDownloadReport(assessments: Assessment[]) {
    if (assessments.length === 0) {
      alert('No assessment data available to generate report')
      return
    }

    // Generate report content
    const reportContent = this.generateReportContent(assessments)
    
    // Create and download the file
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mental-health-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  private generateReportContent(assessments: Assessment[]): string {
    const currentDate = new Date().toLocaleDateString()
    const userName = this.user?.name || 'User'
    
    let report = `MENTAL HEALTH ASSESSMENT REPORT
Generated on: ${currentDate}
User: ${userName}
Total Assessments: ${assessments.length}

${'='.repeat(60)}

SUMMARY STATISTICS
${'='.repeat(60)}

Average Stress Level: ${(assessments.reduce((sum, a) => sum + a.answers.stressLevel, 0) / assessments.length).toFixed(1)}/10
Average Mood Level: ${(assessments.reduce((sum, a) => sum + a.answers.moodLevel, 0) / assessments.length).toFixed(1)}/10
Average Sleep Hours: ${(assessments.reduce((sum, a) => sum + a.answers.sleepHours, 0) / assessments.length).toFixed(1)} hours

Risk Level Distribution:
- Low Risk: ${assessments.filter(a => a.aiAnalysis?.riskLevel === 'Low').length} assessments
- Medium Risk: ${assessments.filter(a => a.aiAnalysis?.riskLevel === 'Medium').length} assessments
- High Risk: ${assessments.filter(a => a.aiAnalysis?.riskLevel === 'High').length} assessments

Most Common Mood: ${this.getMostCommonMood(assessments)}
Most Common Anxiety Frequency: ${this.getMostCommonAnxietyFrequency(assessments)}
Most Common Overwhelmed Frequency: ${this.getMostCommonOverwhelmedFrequency(assessments)}

${'='.repeat(60)}
DETAILED ASSESSMENT HISTORY
${'='.repeat(60)}

`

    assessments.forEach((assessment, index) => {
      const date = new Date(assessment.createdAt).toLocaleDateString()
      const time = new Date(assessment.createdAt).toLocaleTimeString()
      
      report += `Assessment #${index + 1} - ${date} at ${time}
${'-'.repeat(40)}

Mood: ${assessment.answers.mood}
Stress Level: ${assessment.answers.stressLevel}/10
Mood Level: ${assessment.answers.moodLevel}/10
Sleep Hours: ${assessment.answers.sleepHours}
Anxiety Frequency: ${assessment.answers.anxietyFrequency}
Overwhelmed Frequency: ${assessment.answers.overwhelmedFrequency}
Common Feeling: ${assessment.answers.commonFeeling || 'Not specified'}

AI Analysis:
- Risk Level: ${assessment.aiAnalysis?.riskLevel || 'Unknown'}
- Summary: ${assessment.aiAnalysis?.summary || 'No summary available'}
- Recommendations: ${assessment.aiAnalysis?.recommendations ? (Array.isArray(assessment.aiAnalysis.recommendations) 
  ? assessment.aiAnalysis.recommendations.join(', ') 
  : assessment.aiAnalysis.recommendations) : 'No recommendations available'}

${'='.repeat(60)}

`
    })

    report += `
${'='.repeat(60)}
RECOMMENDATIONS
${'='.repeat(60)}

Based on your assessment history, here are some general recommendations:

1. Monitor your stress levels regularly and practice stress management techniques
2. Maintain consistent sleep patterns for better mental health
3. Consider seeking professional help if you notice persistent high-risk assessments
4. Track your mood patterns to identify triggers and positive influences
5. Practice self-care and mindfulness techniques

This report is for informational purposes only and should not replace professional medical advice.
If you have concerns about your mental health, please consult with a qualified healthcare provider.

Report generated by HealthCare+ Mental Health Assessment System
`

    return report
  }

  private getMostCommonMood(assessments: Assessment[]): string {
    const moodCounts = assessments.reduce((counts, assessment) => {
      const mood = assessment.answers.mood
      counts[mood] = (counts[mood] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    return Object.entries(moodCounts).reduce((a, b) => moodCounts[a[0]] > moodCounts[b[0]] ? a : b)[0]
  }

  private getMostCommonAnxietyFrequency(assessments: Assessment[]): string {
    const anxietyCounts = assessments.reduce((counts, assessment) => {
      const anxiety = assessment.answers.anxietyFrequency
      counts[anxiety] = (counts[anxiety] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    return Object.entries(anxietyCounts).reduce((a, b) => anxietyCounts[a[0]] > anxietyCounts[b[0]] ? a : b)[0]
  }

  private getMostCommonOverwhelmedFrequency(assessments: Assessment[]): string {
    const overwhelmedCounts = assessments.reduce((counts, assessment) => {
      const overwhelmed = assessment.answers.overwhelmedFrequency
      counts[overwhelmed] = (counts[overwhelmed] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    return Object.entries(overwhelmedCounts).reduce((a, b) => overwhelmedCounts[a[0]] > overwhelmedCounts[b[0]] ? a : b)[0]
  }

  goToLogin() {
    this.router.navigate(['/login'])
  }
}
