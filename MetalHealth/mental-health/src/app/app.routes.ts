import type { Routes } from "@angular/router"
import { LandingComponent } from "./landing/landing"
import { LoginComponent } from "./login/login"
import { SignupComponent } from "./signup/signup"
import { InfoComponent } from "./info/info"
import { AuthGuard } from "./guards/auth.guard"
import { TermsComponent } from "./terms/terms"
import { HomeComponent } from "./home/home"
import { ProfileComponent } from "./profile/profile"
import { CalendarComponent } from "./calendar/calendar"
import { HistoryComponent } from "./history/history"
import { AnalyticsComponent } from "./analytics/analytics"

export const routes: Routes = [
  { path: "", component: LandingComponent },
  { path: "login", component: LoginComponent },
  { path: "signup", component: SignupComponent },
  { path: "terms", component: TermsComponent, canActivate: [AuthGuard] },
  { path: "home", component: HomeComponent, canActivate: [AuthGuard] },
  { path: "profile", component: ProfileComponent, canActivate: [AuthGuard] },
  { path: "calendar", component: CalendarComponent, canActivate: [AuthGuard] },
  { path: "history", component: HistoryComponent, canActivate: [AuthGuard] },
  { path: "analytics", component: AnalyticsComponent, canActivate: [AuthGuard] },
  { path: "info", component: InfoComponent, canActivate: [AuthGuard] },
  { path: "**", redirectTo: "" },
]
