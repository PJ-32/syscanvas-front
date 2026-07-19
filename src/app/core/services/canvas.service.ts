import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Canvas } from '../models/canvas.model';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
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

  obtenerCanvas(page: number = 0, size: number = 500): Observable<Canvas[]> {
    return this.http.get<any>(`${this.API_URL}/sc/canvas?page=${page}&size=${size}`).pipe(
      map(res => this.extractList(res))
    );
  }

  obtenerCanvasPorId(id: number): Observable<Canvas> {
    return this.http.get<any>(`${this.API_URL}/sc/canvas/${id}`).pipe(
      map(res => this.extractData(res))
    );
  }

  crearCanvas(payload: any): Observable<Canvas> {
    return this.http.post<any>(`${this.API_URL}/sc/canvas`, payload).pipe(
      map(res => this.extractData(res))
    );
  }

  actualizarCanvas(id: number, payload: any): Observable<Canvas> {
    return this.http.put<any>(`${this.API_URL}/sc/canvas/${id}`, payload).pipe(
      map(res => this.extractData(res))
    );
  }

  toggleEditable(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/sc/canvas/${id}/toggle`, {}).pipe(
      map(res => this.extractData(res))
    );
  }

  eliminarCanvas(id: number): Observable<void> {
    return this.http.delete<any>(`${this.API_URL}/sc/canvas/${id}`).pipe(
      map(res => this.extractData(res))
    );
  }

  exportarCanvas(id: number): Observable<Blob> {
    return this.http.get(`${this.API_URL}/sc/canvas/${id}/exportar`, { responseType: 'blob' });
  }

  importarCanvas(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/sc/canvas/importar`, formData).pipe(
      map(res => this.extractData(res))
    );
  }

  obtenerEtapas(id: number): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/sc/canvas/${id}/etapas`).pipe(
      map(res => this.extractData(res) || [])
    );
  }

  obtenerTiposCanvas(): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/sc/tipo-canvas`).pipe(
      map(res => this.extractList(res))
    );
  }
}
