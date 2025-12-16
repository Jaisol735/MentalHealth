import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"
import { AuthService } from "../services/auth.service"

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./navbar.html",
  styleUrls: ["./navbar.css"],
})
export class NavbarComponent {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  goProfile(): void {
    this.router.navigate(["/profile"])
  }

  goAnalytics(): void {
    this.router.navigate(["/analytics"])
  }

  goInfo(): void {
    this.router.navigate(["/info"])
  }

  goCalendar(): void {
    this.router.navigate(["/calendar"])
  }

  goHome(): void {
    this.router.navigate(["/home"])
  }

  logout(): void {
    this.authService.logout()
  }
}
