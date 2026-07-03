import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Tu API apuntando a Spring Boot
  private API_URL = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  login(codPersona: number, password: string): Observable<any> {
    return this.http.post(`${this.API_URL}/login`, { codPersona, password });
  }

  guardarSesion(token: string, rol: string, codPersona: string, nombre: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('rol', rol);
    localStorage.setItem('codPersona', codPersona);
    localStorage.setItem('nombreCompleto', nombre);
  }

  cerrarSesion() {
    localStorage.clear();
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('token');
  }

  recuperarPassword(payload: any): Observable<any> {
    // Apunta a http://localhost:8080/api/auth/cambiar-password
    return this.http.post(`${this.API_URL}/cambiar-password`, payload);
  }
}