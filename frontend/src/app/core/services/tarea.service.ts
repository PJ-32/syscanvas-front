import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Tarea } from '../models/tarea.model';

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  private extractData(res: any): any {
    return res && res.data ? res.data : res;
  }

  private extractList(res: any): any[] {
    const data = this.extractData(res);
    if (!data) return [];
    return data.content ? data.content : (Array.isArray(data) ? data : []);
  }

  obtenerTareas(page: number = 0, size: number = 2000): Observable<Tarea[]> {
    return this.http.get<any>(`${this.API_URL}/sc/tarea?page=${page}&size=${size}`).pipe(
      map(res => this.extractList(res))
    );
  }

  obtenerTareasPorPersona(codPersona: number, page: number = 0, size: number = 2000): Observable<Tarea[]> {
    return this.http.get<any>(`${this.API_URL}/sc/tarea/persona/${codPersona}?page=${page}&size=${size}`).pipe(
      map(res => this.extractList(res))
    );
  }

  obtenerTareasPorEtapa(codEtapa: number): Observable<Tarea[]> {
    return this.http.get<any>(`${this.API_URL}/sc/tarea/etapa/${codEtapa}`).pipe(
      map(res => this.extractData(res) || [])
    );
  }

  crearTarea(payload: any): Observable<Tarea> {
    return this.http.post<any>(`${this.API_URL}/sc/tarea/crear`, payload).pipe(
      map(res => this.extractData(res))
    );
  }

  actualizarTarea(id: number, payload: any): Observable<Tarea> {
    return this.http.put<any>(`${this.API_URL}/sc/tarea/${id}`, payload).pipe(
      map(res => this.extractData(res))
    );
  }

  moverTarea(id: number, nuevoCodEtapa: number): Observable<Tarea> {
    return this.http.put<any>(`${this.API_URL}/sc/tarea/${id}/mover/${nuevoCodEtapa}`, {}).pipe(
      map(res => this.extractData(res))
    );
  }

  cambiarEstadoTarea(id: number, completar: boolean): Observable<Tarea> {
    return this.http.put<any>(`${this.API_URL}/sc/tarea/${id}/estado`, { completar }).pipe(
      map(res => this.extractData(res))
    );
  }

  eliminarTarea(id: number): Observable<void> {
    return this.http.delete<any>(`${this.API_URL}/sc/tarea/${id}`).pipe(
      map(res => this.extractData(res))
    );
  }
}
