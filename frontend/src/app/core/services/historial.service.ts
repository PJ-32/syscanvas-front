import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Historial } from '../models/historial.model';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  private extractData(res: any): any {
    return res && res.data ? res.data : res;
  }

  obtenerHistorial(codCanvas?: number): Observable<Historial[]> {
    const url = codCanvas 
      ? `${this.API_URL}/sc/historial?codCanvas=${codCanvas}`
      : `${this.API_URL}/sc/historial`;
    return this.http.get<any>(url).pipe(
      map(res => this.extractData(res) || [])
    );
  }

  registrarHistorial(payload: any): Observable<Historial> {
    return this.http.post<any>(`${this.API_URL}/sc/historial`, payload).pipe(
      map(res => this.extractData(res))
    );
  }
}
