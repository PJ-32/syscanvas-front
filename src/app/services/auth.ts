import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Tu API apuntando a Spring Boot
  private API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  login(codPersona: number, password: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/login`, { codPersona, password });
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
    return this.http.post(`${this.API_URL}/auth/cambiar-password`, payload);
  }
  
  obtenerFotoPerfil(codPersona: string | number): Observable<any> {
    // Apunta a http://localhost:8080/api/t/empleado/{id}/foto
    return this.http.get<any>(`${this.API_URL}/t/empleado/${codPersona}/foto`);
  }

  // ==========================================
  // RUTAS DEL PERFIL / EMPLEADO
  // ==========================================
  obtenerPerfil(codPersona: string | number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/t/empleado/${codPersona}`);
  }

  actualizarPerfil(codPersona: string | number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/t/empleado/${codPersona}`, payload);
  }

  subirFotoPerfil(codPersona: string | number, base64: string): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/t/empleado/${codPersona}/foto`, { fotoBase64: base64 });
  }

  eliminarFotoPerfil(codPersona: string | number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/t/empleado/${codPersona}/foto`);
  }
}