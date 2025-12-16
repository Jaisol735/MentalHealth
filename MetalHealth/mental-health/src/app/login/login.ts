import { Component,  OnInit } from "@angular/core"
import { FormBuilder,  FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import  { AuthService } from "../services/auth.service"

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./login.html",
  styleUrls: ["./login.css"],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup
  isLoading = false
  errorMessage = ""

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.initializeForm()
  }

  initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
    })
  }

  get email() {
    return this.loginForm.get("email")
  }

  get password() {
    return this.loginForm.get("password")
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true
      this.errorMessage = ""

      const loginData = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
      }

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false
          // Show terms only for newly signed-up users. Existing users go straight home.
          this.router.navigate(["/home"]) 
        },
        error: (error) => {
          this.isLoading = false
          this.errorMessage = error.error?.message || "Login failed. Please try again."
        },
      })
    } else {
      this.markFormGroupTouched()
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key)
      control?.markAsTouched()
    })
  }

  navigateToSignup(): void {
    this.router.navigate(["/signup"])
  }

  navigateToLanding(): void {
    this.router.navigate(["/"])
  }
}
