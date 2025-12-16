import { Component,  OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import  { Router, ActivatedRoute } from "@angular/router"
import { Subject, takeUntil } from "rxjs"
import { AuthService, User } from "../services/auth.service"
import  { DoctorService, Doctor } from "../services/doctor.service"
import { NavbarComponent } from "../navbar/navbar"

@Component({
  selector: "app-info",
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: "./info.html",
  styleUrls: ["./info.css"],
})
export class InfoComponent implements OnInit, OnDestroy {
  currentUser: User | null = null
  doctors: Doctor[] = []
  isLoadingDoctors = false
  errorMessage = ""
  highlightedDoctorId: number | null = null
  private destroy$ = new Subject<void>()

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser()
    this.loadDoctors()
    
    // Check for doctor highlighting from query params
    this.route.queryParams.subscribe(params => {
      if (params['doctorId'] && params['highlight'] === 'true') {
        this.highlightedDoctorId = +params['doctorId'];
        // Scroll to the highlighted doctor after a short delay
        setTimeout(() => {
          this.scrollToDoctor(this.highlightedDoctorId!);
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser = user
    })
  }

  loadDoctors(): void {
    this.isLoadingDoctors = true
    this.doctorService
      .getAllDoctors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.doctors = response.doctors
          this.isLoadingDoctors = false
        },
        error: (error) => {
          this.errorMessage = "Failed to load doctors"
          this.isLoadingDoctors = false
          console.error("Error loading doctors:", error)
        },
      })
  }

  logout(): void {
    this.authService.logout()
  }

  getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 17) return "Good Afternoon"
    return "Good Evening"
  }

  getSpecialityIcon(speciality: string): string {
    const icons: { [key: string]: string } = {
      Psychiatry: "🧘",
      "Clinical Psychology": "🧠",
      "Child & Adolescent Psychiatry": "👶",
      "Addiction Psychiatry": "🚫",
      "Geriatric Psychiatry": "👴",
      "Trauma & PTSD Specialist": "🛡️",
      "Eating Disorders": "🍎",
      "Couples & Family Therapy": "👨‍👩‍👧‍👦",
      "Crisis Intervention": "🚨",
      Neuropsychology: "🧠",
      "Anxiety Disorders": "😰",
      "Mood Disorders": "😔",
      "Sleep Medicine": "😴",
      "LGBTQ+ Mental Health": "🏳️‍🌈",
      "Workplace Mental Health": "💼",
      // Legacy specialties for backward compatibility
      Cardiology: "❤️",
      Neurology: "🧠",
      Orthopedics: "🦴",
      Pediatrics: "👶",
      Dermatology: "🧴",
      "General Medicine": "🩺",
      Surgery: "🔬",
      Gynecology: "👩‍⚕️",
      Ophthalmology: "👁️",
    }
    return icons[speciality] || "👨‍⚕️"
  }

  scrollToDoctor(doctorId: number): void {
    const element = document.getElementById(`doctor-${doctorId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add a temporary highlight effect
      element.classList.add('highlighted-doctor');
      setTimeout(() => {
        element.classList.remove('highlighted-doctor');
      }, 3000);
    }
  }

  isDoctorHighlighted(doctorId: number): boolean {
    return this.highlightedDoctorId === doctorId;
  }
}
