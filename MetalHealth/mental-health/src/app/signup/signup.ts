import { Component, type OnInit } from "@angular/core"
import {  FormBuilder,  FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import  { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import  { AuthService } from "../services/auth.service"

@Component({
  selector: "app-signup",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./signup.html",
  styleUrls: ["./signup.css"],
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup
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
    this.signupForm = this.formBuilder.group(
      {
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        phoneno: ["", [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
        age: ["", [Validators.required, Validators.min(1), Validators.max(120)]],
        gender: ["", [Validators.required]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        confirmPassword: ["", [Validators.required]],
        instagram_token: [""], // Optional field
      },
      { validators: this.passwordMatchValidator },
    )
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get("password")
    const confirmPassword = form.get("confirmPassword")

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true })
      return { passwordMismatch: true }
    }

    if (confirmPassword?.errors?.["passwordMismatch"]) {
      delete confirmPassword.errors["passwordMismatch"]
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null)
      }
    }

    return null
  }

  get name() {
    return this.signupForm.get("name")
  }

  get email() {
    return this.signupForm.get("email")
  }

  get phoneno() {
    return this.signupForm.get("phoneno")
  }

  get age() {
    return this.signupForm.get("age")
  }

  get gender() {
    return this.signupForm.get("gender")
  }

  get password() {
    return this.signupForm.get("password")
  }

  get confirmPassword() {
    return this.signupForm.get("confirmPassword")
  }

  get instagram_token() {
    return this.signupForm.get("instagram_token")
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.isLoading = true
      this.errorMessage = ""

      const signupData = {
        name: this.signupForm.value.name,
        email: this.signupForm.value.email,
        phoneno: this.signupForm.value.phoneno,
        age: Number.parseInt(this.signupForm.value.age),
        gender: this.signupForm.value.gender,
        password: this.signupForm.value.password,
        instagram_token: this.signupForm.value.instagram_token || null,
      }

      this.authService.signup(signupData).subscribe({
        next: (response) => {
          this.isLoading = false
          // New users must accept terms first
          this.router.navigate(["/terms"])
        },
        error: (error) => {
          this.isLoading = false
          this.errorMessage = error.error?.message || "Signup failed. Please try again."
        },
      })
    } else {
      this.markFormGroupTouched()
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach((key) => {
      const control = this.signupForm.get(key)
      control?.markAsTouched()
    })
  }

  navigateToLogin(): void {
    this.router.navigate(["/login"])
  }

  navigateToLanding(): void {
    this.router.navigate(["/"])
  }
}
