import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import  { Observable } from "rxjs"
import { AuthService } from "./auth.service"

export interface Doctor {
  doctor_id: number
  name: string
  speciality: string
  phoneno: string
  details: string
}

export interface CreateDoctorRequest {
  name: string
  speciality: string
  phoneno: string
  details: string
}

@Injectable({
  providedIn: "root",
})
export class DoctorService {
  private apiUrl = "http://localhost:3000/api"

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  getAllDoctors(): Observable<{ doctors: Doctor[] }> {
    return this.http.get<{ doctors: Doctor[] }>(`${this.apiUrl}/doctors`, {
      headers: this.getAuthHeaders(),
    })
  }

  getDoctorById(id: number): Observable<{ doctor: Doctor }> {
    return this.http.get<{ doctor: Doctor }>(`${this.apiUrl}/doctors/${id}`, {
      headers: this.getAuthHeaders(),
    })
  }

  getDoctorsBySpeciality(speciality: string): Observable<{ doctors: Doctor[] }> {
    return this.http.get<{ doctors: Doctor[] }>(`${this.apiUrl}/doctors/speciality/${speciality}`, {
      headers: this.getAuthHeaders(),
    })
  }

  createDoctor(doctorData: CreateDoctorRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/doctors`, doctorData, {
      headers: this.getAuthHeaders(),
    })
  }

  updateDoctor(id: number, doctorData: Partial<CreateDoctorRequest>): Observable<any> {
    return this.http.put(`${this.apiUrl}/doctors/${id}`, doctorData, {
      headers: this.getAuthHeaders(),
    })
  }

  deleteDoctor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/doctors/${id}`, {
      headers: this.getAuthHeaders(),
    })
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken()
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    })
  }
}
