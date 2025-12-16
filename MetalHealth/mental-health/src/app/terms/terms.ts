import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router, RouterLink } from "@angular/router"
import { AuthService, type User } from "../services/auth.service"

@Component({
  selector: "app-terms",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./terms.html",
  styleUrls: ["./terms.css"],
})
export class TermsComponent {
  isChecked = false
  currentUser: User | null = null

  constructor(
    public router: Router,
    private authService: AuthService,
  ) {
    this.currentUser = this.authService.getCurrentUserValue()
  }

  onToggleAgree(event: Event): void {
    const target = event.target as HTMLInputElement
    this.isChecked = !!target.checked
  }

  acceptAndContinue(): void {
    if (!this.currentUser) {
      this.router.navigate(["/login"]) 
      return
    }
    // Persist acceptance locally per user
    localStorage.setItem(`accepted_terms_user_${this.currentUser.id}`, "true")
    this.router.navigate(["/home"]) 
  }
}
