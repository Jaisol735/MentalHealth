import { Component } from "@angular/core"
import  { Router } from "@angular/router"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-landing",
  standalone: true,
  imports: [CommonModule,],
  templateUrl: "./landing.html",
  styleUrls: ["./landing.css"],
})
export class LandingComponent {
  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(["/login"])
  }

  navigateToSignup() {
    this.router.navigate(["/signup"])
  }
}
